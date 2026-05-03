/**
 * Epic 15 / **15C.4** — server-side HTML hardening before ops preview is shown (iframe **`srcDoc`** + **`sandbox=""`**).
 * Uses **DOMPurify** (`isomorphic-dompurify`) with the HTML profile — strips script, on* handlers, and other unsafe patterns.
 */
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeCommsPreviewHtml(html: string): string {
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
