/** Shared PostgREST select for ops bookings queue rows (`/ops/bookings`, account client detail). */
export const OPS_BOOKINGS_QUEUE_SELECT = `
  id, payment_reference, status, payment_status, booking_intent, client_type, customer_account_id,
  pickup_datetime, origin_name, destination_name, customer_name, customer_email,
  total_amount, availability_checked_at, created_at, booking_metadata, referrer_id,
  customer_accounts ( id, name ),
  referrers ( id, name, code ),
  booking_quotes!bookings_current_quote_id_fkey ( status, total_zar ),
  booking_trips (
    sort_order,
    trip_id,
    trips (
      status,
      vehicles ( name )
    )
  )
`

export type OpsBookingsQueueRow = {
	id: string
	payment_reference: string | null
	status: string | null
	payment_status: string | null
	booking_intent: string | null
	client_type: string | null
	customer_account_id: string | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	customer_name: string | null
	customer_email: string | null
	total_amount: number | null
	availability_checked_at: string | null
	created_at: string
	referrer_id?: string | null
	booking_metadata?: unknown
	customer_accounts?: unknown
	referrers?: unknown
	booking_trips: unknown
	booking_quotes?: unknown
}
