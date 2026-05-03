import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendTransactionalSms, isSmsEnabled, formatToE164OrNull, maskE164ForLog, phoneCorrelationHash } from '../sms'

describe('sms', () => {
  const origFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = origFetch
    vi.unstubAllEnvs()
  })

  it('isSmsEnabled is false for empty or 0', () => {
    vi.stubEnv('SMS_ENABLED', '')
    expect(isSmsEnabled()).toBe(false)
    vi.stubEnv('SMS_ENABLED', '0')
    expect(isSmsEnabled()).toBe(false)
  })

  it('isSmsEnabled is true for 1/true/on', () => {
    vi.stubEnv('SMS_ENABLED', '1')
    expect(isSmsEnabled()).toBe(true)
    vi.stubEnv('SMS_ENABLED', 'true')
    expect(isSmsEnabled()).toBe(true)
  })

  it('maskE164ForLog and phoneCorrelationHash are stable, non-PII patterns', () => {
    const m = maskE164ForLog('+27821234567')
    expect(m).toContain('4567')
    expect(m).not.toContain('2782')
    const h = phoneCorrelationHash('+27821234567')
    expect(h).toHaveLength(12)
  })

  it('formatToE164OrNull parses ZA by default', () => {
    expect(formatToE164OrNull('082 123 4567')).toBe('+27821234567')
    expect(formatToE164OrNull('')).toBeNull()
  })

  it('when SMS_ENABLED is off, no fetch and returns skipped with sms_skipped semantics', async () => {
    vi.stubEnv('SMS_ENABLED', '0')
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock
    const r = await sendTransactionalSms({
      toE164: '+27821234567',
      body: 'Hello',
      idempotencyKey: 'test:key',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(r).toEqual(
      expect.objectContaining({
        ok: true,
        mode: 'skipped',
        reason: 'SMS_ENABLED off or unset',
      })
    )
  })

  it('forwards idempotency key to Twilio as Idempotency-Key header on success', async () => {
    vi.stubEnv('SMS_ENABLED', '1')
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACxxxxxxxx')
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'tok')
    vi.stubEnv('TWILIO_FROM_NUMBER', '+15550001111')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"sid":"SM123"}', { status: 201, statusText: 'Created' })
    )
    globalThis.fetch = fetchMock
    const r = await sendTransactionalSms({
      toE164: '+27820000000',
      body: 'X',
      idempotencyKey: 'booking_created_sms:bead-beef',
    })
    if (!r.ok) {
      expect.fail(`expected sent, got ${JSON.stringify(r)}`)
    }
    expect(r.mode).toBe('sent')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['Idempotency-Key']).toBe('booking_created_sms:bead-beef')
  })
})
