import { Resend } from 'resend'

/**
 * Live Resend SDK instance — construct only when calling the API (never in test-skip path).
 * Story **13.7** can import this factory to share one construction pattern.
 */
export type ResendEmailClient = Resend

/** Payload shape for `client.emails.send` — stable surface for booking / ops mailers */
export type ResendSendEmailPayload = {
	from: string
	to: string | string[]
	subject: string
	html: string
	text?: string
	/** Resend: optional RFC headers; **List-Unsubscribe** in **15C.6** */
	headers?: Record<string, string>
}

/** Returns a configured Resend client. Throws only when `apiKey` is blank (programmer error). */
export function getResendClient(apiKey: string): ResendEmailClient {
	const trimmed = apiKey.trim()
	if (!trimmed) {
		throw new Error('getResendClient: apiKey must be non-empty')
	}
	return new Resend(trimmed)
}
