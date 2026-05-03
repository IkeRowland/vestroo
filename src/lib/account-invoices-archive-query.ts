import type { SupabaseClient } from '@supabase/supabase-js'

import { formatQueueStatusLabel } from '@/lib/account-bookings-list-query'
import { parseBookingQuoteLineItems, type BookingQuoteLineItem } from '@/types/booking-quote'
import type { BookingQuoteStatusDb } from '@/types/database.types'

/** (A) Quote lifecycle rows shown in the account archive (excludes `draft`). */
export const ACCOUNT_INVOICES_ARCHIVE_QUOTE_STATUSES: readonly BookingQuoteStatusDb[] = [
	'sent',
	'accepted',
	'superseded',
	'expired',
	'rejected',
] as const

/** (B) Bookings in Epic 13 invoice-queue states for the same account. */
export const ACCOUNT_INVOICES_ARCHIVE_BOOKING_PIPELINE_STATUSES: readonly BookingPipelineStatusDb[] = [
	'ready_to_invoice',
	'invoiced',
	'paid_invoice',
] as const

/**
 * Embed **`bookings`** via **`booking_quotes.booking_id`** only.
 * (`bookings.current_quote_id` adds a second **`booking_quotes` ↔ `bookings`** edge — PostgREST requires a hint.)
 */
const QUOTE_SELECT = `
  id,
  booking_id,
  version,
  total_zar,
  status,
  rendered_html,
  pdf_storage_path,
  sent_at,
  accepted_at,
  rejected_at,
  superseded_at,
  expires_at,
  created_at,
  bookings!booking_id!inner (
    id,
    payment_reference,
    status,
    payment_status,
    payment_received_at,
    purchase_order_ref,
    customer_account_id,
    client_type,
    current_quote_id
  )
`

type BookingEmbed = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	payment_received_at: string | null
	purchase_order_ref: string | null
	customer_account_id: string | null
	client_type: string | null
	current_quote_id: string | null
}

type QuoteRowRaw = {
	id: string
	booking_id: string
	version: number
	total_zar: number
	status: string
	rendered_html: string | null
	pdf_storage_path: string | null
	sent_at: string | null
	accepted_at: string | null
	rejected_at: string | null
	superseded_at: string | null
	expires_at: string | null
	created_at: string
	bookings: BookingEmbed | BookingEmbed[] | null
}

function normalizeBookingEmbed(raw: BookingEmbed | BookingEmbed[] | null): BookingEmbed | null {
	if (!raw) return null
	return Array.isArray(raw) ? raw[0] ?? null : raw
}

function bookingRef(b: Pick<BookingEmbed, 'id' | 'payment_reference'>): string {
	const pr = b.payment_reference?.trim()
	return pr && pr.length > 0 ? pr : b.id.slice(0, 8)
}

function hasRenderableHtml(html: string | null | undefined): boolean {
	return typeof html === 'string' && html.trim().length > 0
}

function sortKeyMs(row: AccountInvoiceArchiveRow): number {
	const primary = row.sent_at ?? row.quote_created_at
	const t = primary ? new Date(primary).getTime() : NaN
	if (!Number.isNaN(t)) return t
	const c = new Date(row.quote_created_at).getTime()
	return Number.isNaN(c) ? 0 : c
}

export type AccountInvoiceArchiveRow = {
	/** `booking_quotes.id` when a quote row backs this archive entry; **null** for invoice-pipeline bookings with no quote rows at all. */
	quote_id: string | null
	booking_id: string
	booking_reference: string
	quote_version: number | null
	total_zar: number | null
	quote_status: BookingQuoteStatusDb | null
	booking_status: string | null
	booking_payment_status: string | null
	booking_payment_received_at: string | null
	booking_purchase_order_ref: string | null
	sent_at: string | null
	accepted_at: string | null
	/** No dedicated DB column in v1 — display "—". */
	invoiced_at: string | null
	/** No dedicated DB column in v1 — display "—". */
	paid_at: string | null
	quote_created_at: string
	has_rendered_html: boolean
	pdf_storage_path: string | null
	/** True when this row exists only to surface invoice-pipeline bookings without any (A)-status quote. */
	is_booking_pipeline_supplemental: boolean
}

/**
 * **Union (A)+(B)** per Story **15A.7**:
 * - **(A)** `booking_quotes` for account-linked bookings with status in `ACCOUNT_INVOICES_ARCHIVE_QUOTE_STATUSES`.
 * - **(B)** `bookings` in invoice-queue statuses; for each booking **not** represented by any quote row from **(A)**,
 *   append **one** supplemental row: latest `booking_quotes` by **version** when any exist; otherwise a booking-only
 *   placeholder (`quote_id` **null**) so the pipeline booking is still visible in the archive.
 *
 * **Dedup:** Row identity is **`booking_quotes.id`** when present; at most one supplemental row per **(B)** booking
 * that has **zero** quotes matching **(A)**.
 */
export async function loadAccountInvoicesArchiveRows(
	supabase: SupabaseClient,
	activeAccountId: string,
): Promise<{ rows: AccountInvoiceArchiveRow[]; error: string | null }> {
	const { data: quoteData, error: quoteErr } = await supabase
		.from('booking_quotes')
		.select(QUOTE_SELECT)
		.eq('bookings.customer_account_id', activeAccountId)
		.eq('bookings.client_type', 'account_client')
		.in('status', [...ACCOUNT_INVOICES_ARCHIVE_QUOTE_STATUSES])

	if (quoteErr) {
		return { rows: [], error: quoteErr.message }
	}

	const fromQuotes: AccountInvoiceArchiveRow[] = []
	const bookingIdsFromA = new Set<string>()

	for (const raw of (quoteData ?? []) as QuoteRowRaw[]) {
		const b = normalizeBookingEmbed(raw.bookings)
		if (!b) continue
		bookingIdsFromA.add(b.id)
		fromQuotes.push({
			quote_id: raw.id,
			booking_id: b.id,
			booking_reference: bookingRef(b),
			quote_version: raw.version,
			total_zar: raw.total_zar,
			quote_status: raw.status as BookingQuoteStatusDb,
			booking_status: b.status,
			booking_payment_status: b.payment_status ?? null,
			booking_payment_received_at: b.payment_received_at ?? null,
			booking_purchase_order_ref: b.purchase_order_ref ?? null,
			sent_at: raw.sent_at,
			accepted_at: raw.accepted_at,
			invoiced_at: null,
			paid_at: null,
			quote_created_at: raw.created_at,
			has_rendered_html: hasRenderableHtml(raw.rendered_html),
			pdf_storage_path: raw.pdf_storage_path,
			is_booking_pipeline_supplemental: false,
		})
	}

	const { data: bookingData, error: bookingErr } = await supabase
		.from('bookings')
		.select(
			'id, payment_reference, status, payment_status, payment_received_at, purchase_order_ref, customer_account_id, client_type, current_quote_id, created_at',
		)
		.eq('customer_account_id', activeAccountId)
		.eq('client_type', 'account_client')
		.in('status', [...ACCOUNT_INVOICES_ARCHIVE_BOOKING_PIPELINE_STATUSES])

	if (bookingErr) {
		return { rows: [], error: bookingErr.message }
	}

	const supplementals: AccountInvoiceArchiveRow[] = []

	for (const row of bookingData ?? []) {
		const b = row as {
			id: string
			payment_reference: string | null
			status: string | null
			payment_status: string | null
			payment_received_at: string | null
			purchase_order_ref: string | null
			customer_account_id: string | null
			client_type: string | null
			current_quote_id: string | null
			created_at: string
		}
		if (bookingIdsFromA.has(b.id)) continue

		const { data: latestQuote, error: lqErr } = await supabase
			.from('booking_quotes')
			.select(
				'id, booking_id, version, total_zar, status, rendered_html, pdf_storage_path, sent_at, accepted_at, rejected_at, superseded_at, expires_at, created_at',
			)
			.eq('booking_id', b.id)
			.order('version', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (lqErr || !latestQuote) {
			supplementals.push({
				quote_id: null,
				booking_id: b.id,
				booking_reference: bookingRef(b),
				quote_version: null,
				total_zar: null,
				quote_status: null,
				booking_status: b.status,
				booking_payment_status: b.payment_status ?? null,
				booking_payment_received_at: b.payment_received_at ?? null,
				booking_purchase_order_ref: b.purchase_order_ref ?? null,
				sent_at: null,
				accepted_at: null,
				invoiced_at: null,
				paid_at: null,
				quote_created_at: b.created_at,
				has_rendered_html: false,
				pdf_storage_path: null,
				is_booking_pipeline_supplemental: true,
			})
			continue
		}

		const q = latestQuote as {
			id: string
			booking_id: string
			version: number
			total_zar: number
			status: string
			rendered_html: string | null
			pdf_storage_path: string | null
			sent_at: string | null
			accepted_at: string | null
			rejected_at: string | null
			superseded_at: string | null
			expires_at: string | null
			created_at: string
		}

		supplementals.push({
			quote_id: q.id,
			booking_id: b.id,
			booking_reference: bookingRef(b),
			quote_version: q.version,
			total_zar: q.total_zar,
			quote_status: q.status as BookingQuoteStatusDb,
			booking_status: b.status,
			booking_payment_status: b.payment_status ?? null,
			booking_payment_received_at: b.payment_received_at ?? null,
			booking_purchase_order_ref: b.purchase_order_ref ?? null,
			sent_at: q.sent_at,
			accepted_at: q.accepted_at,
			invoiced_at: null,
			paid_at: null,
			quote_created_at: q.created_at,
			has_rendered_html: hasRenderableHtml(q.rendered_html),
			pdf_storage_path: q.pdf_storage_path,
			is_booking_pipeline_supplemental: true,
		})
	}

	const merged = [...fromQuotes, ...supplementals].sort((a, b) => sortKeyMs(b) - sortKeyMs(a))

	return { rows: merged, error: null }
}

export function formatInvoiceArchiveQuoteStatus(status: BookingQuoteStatusDb | null): string {
	if (!status) return '—'
	return formatQueueStatusLabel(status)
}

const VIEWER_QUOTE_SELECT = `
  id,
  booking_id,
  version,
  status,
  rendered_html,
  bookings!booking_id!inner (
    id,
    payment_reference,
    customer_account_id,
    client_type
  )
`

export type AccountInvoiceQuoteViewerPayload = {
	quote_id: string
	booking_id: string
	booking_reference: string
	version: number
	status: BookingQuoteStatusDb
	rendered_html: string | null
}

/**
 * Loads a single quote for the immutable HTML viewer, scoped to **active** account (same pattern as **15A.4**).
 */
export async function loadAccountInvoiceQuoteForViewer(
	supabase: SupabaseClient,
	quoteId: string,
	activeAccountId: string,
): Promise<AccountInvoiceQuoteViewerPayload | null> {
	const { data, error } = await supabase
		.from('booking_quotes')
		.select(VIEWER_QUOTE_SELECT)
		.eq('id', quoteId)
		.eq('bookings.customer_account_id', activeAccountId)
		.eq('bookings.client_type', 'account_client')
		.maybeSingle()

	if (error || !data) return null

	const raw = data as {
		id: string
		booking_id: string
		version: number
		status: string
		rendered_html: string | null
		bookings: BookingEmbed | BookingEmbed[] | null
	}
	const b = normalizeBookingEmbed(raw.bookings)
	if (!b) return null

	return {
		quote_id: raw.id,
		booking_id: raw.booking_id,
		booking_reference: bookingRef(b),
		version: raw.version,
		status: raw.status as BookingQuoteStatusDb,
		rendered_html: raw.rendered_html,
	}
}

const MS_PER_DAY = 86_400_000
const NINETY_DAYS_MS = 90 * MS_PER_DAY

/** KPI helpers — **Story 18.6** / **FE.18.5** (see `docs/ops-design-system-parity.md` § 18.6). */
export function computeAccountInvoiceKpis(
	rows: AccountInvoiceArchiveRow[],
	creditTermsDays: number,
): { paid90d: number; awaitingPayment: number; overdue: number } {
	const now = Date.now()
	let paid90d = 0
	let awaitingPayment = 0
	let overdue = 0
	const termsMs = Math.max(0, creditTermsDays) * MS_PER_DAY

	for (const r of rows) {
		const paidTs = r.booking_payment_received_at ? new Date(r.booking_payment_received_at).getTime() : NaN
		if (r.booking_status === 'paid_invoice' && Number.isFinite(paidTs) && now - paidTs <= NINETY_DAYS_MS) {
			paid90d++
		}

		const awaiting =
			r.booking_status === 'ready_to_invoice' ||
			(r.booking_status === 'invoiced' && r.booking_payment_status !== 'paid')
		if (awaiting) {
			awaitingPayment++
			const baseIso = r.sent_at ?? r.accepted_at ?? r.quote_created_at
			const baseMs = baseIso ? new Date(baseIso).getTime() : NaN
			if (Number.isFinite(baseMs) && now > baseMs + termsMs) {
				overdue++
			}
		}
	}

	return { paid90d, awaitingPayment, overdue }
}

function formatMediumDate(iso: string | null): string | null {
	if (!iso) return null
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return null
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(d)
}

function addDaysIso(iso: string, days: number): string | null {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return null
	d.setUTCDate(d.getUTCDate() + days)
	return d.toISOString()
}

export type AccountInvoiceRailTimelineEvent = { at: string; label: string }

export function buildAccountInvoiceTimeline(
	row: Pick<
		AccountInvoiceArchiveRow,
		| 'sent_at'
		| 'accepted_at'
		| 'quote_created_at'
		| 'quote_status'
		| 'booking_status'
		| 'booking_payment_status'
		| 'booking_payment_received_at'
	>,
): AccountInvoiceRailTimelineEvent[] {
	const out: AccountInvoiceRailTimelineEvent[] = []
	if (row.sent_at) {
		out.push({ at: row.sent_at, label: 'Quote sent' })
	}
	if (row.accepted_at) {
		out.push({ at: row.accepted_at, label: 'Quote accepted' })
	}
	const bs = row.booking_status
	if (bs === 'ready_to_invoice') {
		out.push({
			at: row.accepted_at ?? row.sent_at ?? row.quote_created_at,
			label: 'Ready to invoice',
		})
	}
	if (bs === 'invoiced') {
		out.push({
			at: row.accepted_at ?? row.sent_at ?? row.quote_created_at,
			label: 'Invoiced — awaiting payment',
		})
	}
	if (bs === 'paid_invoice' || row.booking_payment_status === 'paid') {
		const at = row.booking_payment_received_at ?? row.accepted_at ?? row.sent_at
		if (at) {
			out.push({ at, label: 'Marked paid' })
		}
	}
	return [...out].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

const RAIL_QUOTE_SELECT = `
  id,
  booking_id,
  version,
  total_zar,
  status,
  line_items,
  rendered_html,
  pdf_storage_path,
  sent_at,
  accepted_at,
  created_at,
  bookings!booking_id!inner (
    id,
    payment_reference,
    status,
    payment_status,
    payment_received_at,
    purchase_order_ref,
    customer_account_id,
    client_type
  )
`

export type AccountInvoiceRailDetail = {
	listRowKey: string
	quote_id: string | null
	booking_id: string
	booking_reference: string
	quote_version: number | null
	total_zar: number | null
	quote_status: BookingQuoteStatusDb | null
	booking_status: string | null
	payment_status: string | null
	sent_at: string | null
	accepted_at: string | null
	quote_created_at: string
	issueDateLabel: string
	dueDateLabel: string | null
	isOverdue: boolean
	line_items: BookingQuoteLineItem[] | null
	pdf_storage_path: string | null
	has_rendered_html: boolean
	purchase_order_ref: string | null
	account_requires_po: boolean
	credit_terms_days: number
	timeline: AccountInvoiceRailTimelineEvent[]
	payHref: string
	fullQuoteHref: string | null
	canPay: boolean
}

/**
 * Resolves **`?id=`** rail selection: **`booking_quotes.id`** when present on the archive row, otherwise
 * **`bookings.id`** for supplemental booking-only rows.
 */
export async function loadAccountInvoiceRailDetail(
	supabase: SupabaseClient,
	selectionId: string,
	activeAccountId: string,
	accountRequiresPo: boolean,
	creditTermsDays: number,
): Promise<AccountInvoiceRailDetail | null> {
	const { data, error } = await supabase
		.from('booking_quotes')
		.select(RAIL_QUOTE_SELECT)
		.eq('id', selectionId)
		.eq('bookings.customer_account_id', activeAccountId)
		.eq('bookings.client_type', 'account_client')
		.maybeSingle()

	if (!error && data) {
		const raw = data as {
			id: string
			booking_id: string
			version: number
			total_zar: number
			status: string
			line_items: unknown
			rendered_html: string | null
			pdf_storage_path: string | null
			sent_at: string | null
			accepted_at: string | null
			created_at: string
			bookings: BookingEmbed | BookingEmbed[] | null
		}
		const b = normalizeBookingEmbed(raw.bookings)
		if (!b) return null
		const row: AccountInvoiceArchiveRow = {
			quote_id: raw.id,
			booking_id: b.id,
			booking_reference: bookingRef(b),
			quote_version: raw.version,
			total_zar: raw.total_zar,
			quote_status: raw.status as BookingQuoteStatusDb,
			booking_status: b.status,
			booking_payment_status: b.payment_status ?? null,
			booking_payment_received_at: b.payment_received_at ?? null,
			booking_purchase_order_ref: b.purchase_order_ref ?? null,
			sent_at: raw.sent_at,
			accepted_at: raw.accepted_at,
			invoiced_at: null,
			paid_at: null,
			quote_created_at: raw.created_at,
			has_rendered_html: hasRenderableHtml(raw.rendered_html),
			pdf_storage_path: raw.pdf_storage_path,
			is_booking_pipeline_supplemental: false,
		}
		return buildRailDetailFromSyntheticRow(row, accountRequiresPo, creditTermsDays, parseBookingQuoteLineItems(raw.line_items))
	}

	const { data: bRow, error: bErr } = await supabase
		.from('bookings')
		.select(
			'id, payment_reference, status, payment_status, payment_received_at, purchase_order_ref, customer_account_id, client_type, created_at',
		)
		.eq('id', selectionId)
		.eq('customer_account_id', activeAccountId)
		.eq('client_type', 'account_client')
		.maybeSingle()

	if (bErr || !bRow) return null

	const b = bRow as {
		id: string
		payment_reference: string | null
		status: string | null
		payment_status: string | null
		payment_received_at: string | null
		purchase_order_ref: string | null
		customer_account_id: string | null
		client_type: string | null
		created_at: string
	}

	const { data: latestQuote } = await supabase
		.from('booking_quotes')
		.select(
			'id, booking_id, version, total_zar, status, line_items, rendered_html, pdf_storage_path, sent_at, accepted_at, created_at',
		)
		.eq('booking_id', b.id)
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (latestQuote) {
		const q = latestQuote as {
			id: string
			booking_id: string
			version: number
			total_zar: number
			status: string
			line_items: unknown
			rendered_html: string | null
			pdf_storage_path: string | null
			sent_at: string | null
			accepted_at: string | null
			created_at: string
		}
		const syn: AccountInvoiceArchiveRow = {
			quote_id: q.id,
			booking_id: b.id,
			booking_reference: bookingRef(b),
			quote_version: q.version,
			total_zar: q.total_zar,
			quote_status: q.status as BookingQuoteStatusDb,
			booking_status: b.status,
			booking_payment_status: b.payment_status ?? null,
			booking_payment_received_at: b.payment_received_at ?? null,
			booking_purchase_order_ref: b.purchase_order_ref ?? null,
			sent_at: q.sent_at,
			accepted_at: q.accepted_at,
			invoiced_at: null,
			paid_at: null,
			quote_created_at: q.created_at,
			has_rendered_html: hasRenderableHtml(q.rendered_html),
			pdf_storage_path: q.pdf_storage_path,
			is_booking_pipeline_supplemental: true,
		}
		return buildRailDetailFromSyntheticRow(syn, accountRequiresPo, creditTermsDays, parseBookingQuoteLineItems(q.line_items))
	}

	const syn: AccountInvoiceArchiveRow = {
		quote_id: null,
		booking_id: b.id,
		booking_reference: bookingRef(b),
		quote_version: null,
		total_zar: null,
		quote_status: null,
		booking_status: b.status,
		booking_payment_status: b.payment_status ?? null,
		booking_payment_received_at: b.payment_received_at ?? null,
		booking_purchase_order_ref: b.purchase_order_ref ?? null,
		sent_at: null,
		accepted_at: null,
		invoiced_at: null,
		paid_at: null,
		quote_created_at: b.created_at,
		has_rendered_html: false,
		pdf_storage_path: null,
		is_booking_pipeline_supplemental: true,
	}
	return buildRailDetailFromSyntheticRow(syn, accountRequiresPo, creditTermsDays, null)
}

function buildRailDetailFromSyntheticRow(
	row: AccountInvoiceArchiveRow,
	accountRequiresPo: boolean,
	creditTermsDays: number,
	lineOverride: BookingQuoteLineItem[] | null,
): AccountInvoiceRailDetail {
	const issueIso = row.sent_at ?? row.quote_created_at
	const issueDateLabel = formatMediumDate(issueIso) ?? '—'
	const baseForDue = row.sent_at ?? row.accepted_at ?? row.quote_created_at
	const dueIso = baseForDue ? addDaysIso(baseForDue, Math.max(0, creditTermsDays)) : null
	const dueDateLabel = dueIso ? formatMediumDate(dueIso) : null
	const now = Date.now()
	const dueMs = dueIso ? new Date(dueIso).getTime() : NaN
	const isOverdue =
		Number.isFinite(dueMs) &&
		now > dueMs &&
		row.booking_status === 'invoiced' &&
		row.booking_payment_status !== 'paid'

	const canPay = row.booking_status === 'ready_to_invoice' || row.booking_status === 'invoiced'
	const listRowKey = row.quote_id ?? row.booking_id
	const fullQuoteHref =
		row.quote_id && row.has_rendered_html ? `/account/invoices/${row.quote_id}` : null

	return {
		listRowKey,
		quote_id: row.quote_id,
		booking_id: row.booking_id,
		booking_reference: row.booking_reference,
		quote_version: row.quote_version,
		total_zar: row.total_zar,
		quote_status: row.quote_status,
		booking_status: row.booking_status,
		payment_status: row.booking_payment_status,
		sent_at: row.sent_at,
		accepted_at: row.accepted_at,
		quote_created_at: row.quote_created_at,
		issueDateLabel,
		dueDateLabel,
		isOverdue,
		line_items: lineOverride,
		pdf_storage_path: row.pdf_storage_path,
		has_rendered_html: row.has_rendered_html,
		purchase_order_ref: row.booking_purchase_order_ref,
		account_requires_po: accountRequiresPo,
		credit_terms_days: creditTermsDays,
		timeline: buildAccountInvoiceTimeline(row),
		payHref: `/account/bookings?id=${encodeURIComponent(row.booking_id)}`,
		fullQuoteHref,
		canPay,
	}
}
