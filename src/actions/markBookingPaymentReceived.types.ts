/**
 * Public contract for {@link markBookingPaymentReceivedAction} (Story 16.14, Theme N / US-N3).
 *
 * Constants and types are kept in this **sidecar module** (rather than the `'use server'`
 * action file) because Next.js App Router enforces "only async functions may be exported
 * from a `'use server'` file" — exporting plain constants or types directly from
 * `markBookingPaymentReceived.ts` breaks the build with:
 *
 *     Only async functions are allowed to be exported in a "use server" file.
 *
 * The action file imports these values back, so the action's runtime behaviour is unchanged.
 */

/** Variance tolerance — values within ±R 0.01 are treated as exact (epic US-N3). */
export const PAYMENT_VARIANCE_TOLERANCE_ZAR = 0.01

/** Free-text guard: keep evidence references compact for queue rendering / audit display. */
export const PAYMENT_EVIDENCE_REF_MAX_LENGTH = 200

/** Successful outcome shape for `markBookingPaymentReceivedAction`. */
export type MarkBookingPaymentReceivedSuccess = {
	ok: true
	bookingId: string
	priorStatus: string
	newStatus: 'ready_to_assign' | 'paid'
	idempotent: boolean
	variance: boolean
}
