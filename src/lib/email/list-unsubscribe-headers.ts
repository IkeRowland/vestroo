import { resolveSupportEmailAddress } from '@/lib/email/email-copy'
import type { CommsPreferenceCategoryKey } from '@/types/comms-preferences'

/**
 * **AC7** — `List-Unsubscribe` for **non-transactional** mail. **Resend** `emails.send` supports custom **headers** in v3+;
 * if the provider strips them in an environment, document in story **Progress Notes** (visible footers still ship).
 *
 * **Omit** `List-Unsubscribe-Post` (one-click) without a tokenised backend.
 */
export function buildListUnsubscribeHeaderValue(input: {
	category: CommsPreferenceCategoryKey
	/** When true, use **HTTPS** preference URL; when false, **mailto** only. */
	portalPreferenceLinks: boolean
	/** Same as **footer** deep link. */
	managePrefsAbsoluteUrl: string | null
}): Record<string, string> {
	if (input.category === 'transactional') {
		return {}
	}
	if (input.portalPreferenceLinks && input.managePrefsAbsoluteUrl) {
		const u = input.managePrefsAbsoluteUrl.trim()
		if (u.startsWith('https://') || u.startsWith('http://')) {
			return { 'List-Unsubscribe': `<${u}>` }
		}
	}
	const mail = resolveSupportEmailAddress()
	const mailto = `mailto:${encodeURIComponent(mail)}?subject=${encodeURIComponent('List-Unsubscribe')}`
	return { 'List-Unsubscribe': `<${mailto}>` }
}
