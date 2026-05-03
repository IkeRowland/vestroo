/**
 * Transactional SMS (server-only). Provider: Twilio REST via `fetch` (no extra npm deps).
 * Set SMS_ENABLED; when false/unset, no outbound HTTP (see `sms_skipped` logs).
 */
import { createHash } from 'crypto'

import { parsePhoneNumberWithError, type CountryCode } from 'libphonenumber-js'

const LOG_PREFIX = '[vestroo:sms]'
const MAX_ATTEMPTS = 3
const BACKOFF_MS: readonly number[] = [0, 200, 500]

function isEnvTruthy(v: string | undefined): boolean {
  if (v === undefined) return false
  const t = v.trim().toLowerCase()
  return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}

/** When false or unset, no live provider HTTP. */
export function isSmsEnabled(): boolean {
  return isEnvTruthy(process.env.SMS_ENABLED)
}

function defaultCountry(): CountryCode {
  const c = (process.env.SMS_DEFAULT_COUNTRY || 'ZA').trim().toUpperCase()
  if (c.length === 2) return c as CountryCode
  return 'ZA'
}

/** Mask for structured logs (never log full E.164 in non-debug paths). */
export function maskE164ForLog(e164: string): string {
  const d = e164.replace(/\D/g, '')
  if (d.length <= 4) return '****'
  return `***${d.slice(-4)}`
}

/** One-way phone fingerprint for correlation without storing raw digits in logs. */
export function phoneCorrelationHash(e164: string): string {
  return createHash('sha256').update(e164, 'utf8').digest('hex').slice(0, 12)
}

export function formatToE164OrNull(
  raw: string | null | undefined,
  defaultCountryCode = defaultCountry()
): string | null {
  const t = raw?.trim() ?? ''
  if (t.length === 0) return null
  try {
    const p = parsePhoneNumberWithError(t, defaultCountryCode)
    if (!p.isValid()) return null
    return p.format('E.164')
  } catch {
    return null
  }
}

export type SendTransactionalSmsInput = {
  /** E.164 destination (caller may use `formatToE164OrNull` first). */
  toE164: string
  /**
   * Short transactional body only. Do not log this at `info` with full text in production
   * — use `bodyCharLength` in logs if needed.
   */
  body: string
  /**
   * Stable per business event, e.g. `booking_created_sms:{id}`.
   * Passed to provider as Idempotency-Key when supported.
   */
  idempotencyKey?: string
  /** Optional business correlation (e.g. trip id) without PII. */
  correlationId?: string
  /** 'trip' for masking trip_id in final failure logs */
  correlationKind?: 'trip' | 'booking' | 'none'
}

export type SendTransactionalSmsResult =
  | { ok: true; mode: 'sent'; provider: 'twilio'; providerMessageId?: string; attempts: number }
  | { ok: true; mode: 'skipped' | 'skipped_invalid_to'; attempts: number; reason: string }
  | {
      ok: false
      attempts: number
      error: { kind: 'twilio_api' | 'network' | 'config' | 'unknown'; message: string }
    }

type TwilioSendOnceResult =
  | { ok: true; sid?: string }
  | { ok: false; message: string }

async function postTwilioMessage(
  to: string,
  from: string,
  body: string,
  idempotencyKey: string | undefined
): Promise<TwilioSendOnceResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? ''
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? process.env.SMS_PROVIDER_API_KEY?.trim() ?? ''
  if (!accountSid || !authToken) {
    return { ok: false, message: 'Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN (or SMS_PROVIDER_API_KEY)' }
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`, 'utf8').toString('base64')
  const form = new URLSearchParams()
  form.set('To', to)
  form.set('From', from)
  form.set('Body', body)
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  const idem = idempotencyKey?.trim()
  if (idem && idem.length > 0) {
    headers['Idempotency-Key'] = idem.slice(0, 256)
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body: form.toString() })
    const text = await res.text()
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    let sid: string | undefined
    try {
      const j = JSON.parse(text) as { sid?: string }
      sid = j.sid
    } catch {
      /* no-op */
    }
    return { ok: true, sid }
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    return { ok: false, message: m }
  }
}

function resolveFromNumber(): string | null {
  const t = process.env.TWILIO_FROM_NUMBER?.trim() || process.env.SMS_PROVIDER_FROM_NUMBER?.trim()
  return t && t.length > 0 ? t : null
}

/**
 * One transactional SMS with bounded retry (2–3 attempts) and idempotency key.
 * Does not throw; callers in Server Actions can rely on no user-facing throw for provider errors.
 */
export async function sendTransactionalSms(
  input: SendTransactionalSmsInput
): Promise<SendTransactionalSmsResult> {
  const to = input.toE164?.trim() ?? ''
  if (!to || to.length < 4) {
    return {
      ok: true,
      mode: 'skipped_invalid_to',
      attempts: 0,
      reason: 'missing_to',
    }
  }
  const body = input.body?.trim() ?? ''
  if (body.length === 0) {
    return { ok: true, mode: 'skipped_invalid_to', attempts: 0, reason: 'empty_body' }
  }

  const toMasked = maskE164ForLog(to)
  const idem = input.idempotencyKey?.trim() ? input.idempotencyKey.trim().slice(0, 256) : undefined

  if (!isSmsEnabled()) {
    console.info(`${LOG_PREFIX} sms_skipped (disabled, no live HTTP)`, {
      event: 'sms_skipped',
      reason: 'sms_disabled',
      to_masked: toMasked,
      idempotency_key: idem,
      correlation: input.correlationId
        ? { id: input.correlationId, kind: input.correlationKind ?? 'none' }
        : undefined,
    })
    return { ok: true, mode: 'skipped', attempts: 0, reason: 'SMS_ENABLED off or unset' }
  }

  const from = resolveFromNumber()
  if (!from) {
    console.error(`${LOG_PREFIX} sms config missing from number`, {
      event: 'sms_skipped',
      reason: 'missing_from',
    })
    return {
      ok: false,
      attempts: 0,
      error: { kind: 'config', message: 'TWILIO_FROM_NUMBER or SMS_PROVIDER_FROM_NUMBER required' },
    }
  }

  const provider = (process.env.SMS_PROVIDER || 'twilio').trim().toLowerCase()
  if (provider !== 'twilio') {
    return {
      ok: false,
      attempts: 0,
      error: { kind: 'config', message: `SMS_PROVIDER "${provider}" is not supported yet (use twilio)` },
    }
  }

  let lastMessage = 'unknown'
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = BACKOFF_MS[attempt] ?? 500
      await new Promise((r) => setTimeout(r, delay))
      console.info(`${LOG_PREFIX} sms_retry`, {
        event: 'sms_retry',
        attempt: attempt + 1,
        to_masked: toMasked,
        idempotency_key: idem,
      })
    } else {
      console.info(`${LOG_PREFIX} sms_send_start`, {
        event: 'sms_send_start',
        to_masked: toMasked,
        body_len: body.length,
        idempotency_key: idem,
        phone_fp: phoneCorrelationHash(to),
      })
    }

    const once = await postTwilioMessage(to, from, body, idem)
    if (once.ok) {
      console.info(`${LOG_PREFIX} sms_send_success`, {
        event: 'sms_send_success',
        provider: 'twilio',
        attempts: attempt + 1,
        idempotency_key: idem,
        provider_message_id: once.sid,
      })
      return {
        ok: true,
        mode: 'sent',
        provider: 'twilio',
        providerMessageId: once.sid,
        attempts: attempt + 1,
      }
    }
    lastMessage = once.message
    console.error(`${LOG_PREFIX} sms_send_attempt_failed`, {
      event: 'sms_send_attempt_failed',
      attempt: attempt + 1,
      max: MAX_ATTEMPTS,
      error: lastMessage,
      to_masked: toMasked,
    })
  }

  const cor = input.correlationId
  const logPayload: Record<string, unknown> = {
    event: 'sms_send_exhausted',
    to_masked: toMasked,
    attempts: MAX_ATTEMPTS,
    error: lastMessage,
    idempotency_key: idem,
  }
  if (cor) {
    if (input.correlationKind === 'trip') {
      logPayload.trip_id = cor
    } else if (input.correlationKind === 'booking') {
      logPayload.booking_id = cor
    } else {
      logPayload.correlation_id = cor
    }
  }

  console.error(`${LOG_PREFIX} sms_send_final_failure (non-fatal to caller)`, logPayload)

  const kind: 'twilio_api' | 'network' = lastMessage.toLowerCase().includes('http')
    ? 'twilio_api'
    : 'network'
  return {
    ok: false,
    attempts: MAX_ATTEMPTS,
    error: { kind, message: lastMessage },
  }
}

export type NotifyBookingCreatedSmsInput = {
  bookingId: string
  customerPhone: string
}

/**
 * After successful booking row insert: minimal transactional text (no marketing).
 */
export async function notifyBookingCreatedSms(
  payload: NotifyBookingCreatedSmsInput
): Promise<void> {
  const to = formatToE164OrNull(payload.customerPhone)
  if (!to) {
    console.info(`${LOG_PREFIX} notify_booking_created_sms_invalid_phone`, {
      event: 'sms_skipped',
      reason: 'invalid_or_missing_phone',
      booking_id: payload.bookingId,
    })
    return
  }
  const body = 'Vestroo: we received your booking. We will contact you with next steps.'
  await sendTransactionalSms({
    toE164: to,
    body,
    idempotencyKey: `booking_created_sms:${payload.bookingId}`,
    correlationId: payload.bookingId,
    correlationKind: 'booking',
  })
}
