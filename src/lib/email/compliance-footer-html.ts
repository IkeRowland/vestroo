/**
 * **15C.6** — POPIA / CAN-SPAM–style **HTML** footers and injection before `</body>`.
 * Server-only; company lines read from **env** (no secrets in `NEXT_PUBLIC_*`).
 */
import { resolveSupportEmailAddress } from '@/lib/email/email-copy'
import { getSiteUrl } from '@/lib/site-url'
import type { CommsPreferenceCategoryKey } from '@/types/comms-preferences'

export type EmailComplianceFooterContext = {
	/** `informational` / `marketing` get full block; `transactional` get minimal. */
	category: CommsPreferenceCategoryKey
	/**
	 * When `true` and `category` is `informational` or `marketing`, add **Manage email preferences** /
	 * **Unsubscribe from this type of message** links to **`/account/preferences?category=...`**.
	 * When `false`, use **mailto** + optional **privacy** link (walk-in / no member / ops).
	 */
	portalPreferenceLinks: boolean
	/**
	 * Which **`?category=`** to use for portal links (must match `getCommsEventCommsCategory` for **informational** / **marketing**).
	 * Ignored when `portalPreferenceLinks` is false.
	 */
	prefsLinkCategory: 'informational' | 'marketing' | null
	/** Build absolute URL for path+query; normally `buildAccountPreferencesAbsoluteUrl` from this package. */
	buildAccountPreferencesUrl: (c: 'informational' | 'marketing') => string
}

function escapeAttr(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function companyLegalOrTradingName(): string {
	return (
		process.env.COMPANY_LEGAL_NAME?.trim() ||
		process.env.COMPANY_TRADING_NAME?.trim() ||
		'Vestroo'
	)
}

function companyAddressLine(): string {
	return process.env.COMPANY_REGISTERED_ADDRESS?.trim() || ''
}

/**
 * **Public** marketing/privacy page for walk-in / non-portal footers.
 * **Server-only** (not `NEXT_PUBLIC_*`) so we do not commit to client exposure.
 */
export function getPublicPrivacyUrlForEmailFooter(): string | null {
	const u = process.env.PUBLIC_PRIVACY_URL?.trim()
	if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
		return u
	}
	return null
}

function publicContactPathUrl(): string {
	/** Optional path on the same app origin, e.g. `/contact` */
	const path = process.env.PUBLIC_MARKETING_CONTACT_PATH?.trim()
	if (path && path.startsWith('/')) {
		return `${getSiteUrl().replace(/\/$/, '')}${path}`
	}
	return `${getSiteUrl().replace(/\/$/, '')}/contact`
}

function supportMailtoUnsubscribeLink(): string {
	const addr = resolveSupportEmailAddress()
	return `mailto:${encodeURIComponent(addr)}?subject=${encodeURIComponent('Unsubscribe or update my email preferences')}`
}

function buildFullNonTransactionalBlock(ctx: EmailComplianceFooterContext): string {
	const name = companyLegalOrTradingName()
	const address = companyAddressLine()
	const support = resolveSupportEmailAddress()
	const addrLine = address ? `${escapeHtml(address)}<br/>` : ''
	const supportLine = `Contact: <a href="mailto:${escapeAttr(support)}">${escapeHtml(support)}</a>`

	let prefBlock = ''
	if (ctx.portalPreferenceLinks && ctx.prefsLinkCategory) {
		const url = ctx.buildAccountPreferencesUrl(ctx.prefsLinkCategory)
		const c = ctx.prefsLinkCategory
		prefBlock = `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;">
<a href="${escapeAttr(url)}">Manage email preferences</a>
 &nbsp;|&nbsp;
<a href="${escapeAttr(url)}">Unsubscribe from this type of message</a> (via preference centre, section: <strong>${escapeHtml(c)}</strong>)</p>`
	} else {
		const contact = publicContactPathUrl()
		const privacy = getPublicPrivacyUrlForEmailFooter()
		prefBlock = `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;">
<a href="${escapeAttr(supportMailtoUnsubscribeLink())}">Contact us about email preferences or opt-out</a>
 &nbsp;|&nbsp;
<a href="${escapeAttr(contact)}">Contact</a>${
			privacy
				? ` &nbsp;|&nbsp; <a href="${escapeAttr(privacy)}">Privacy</a>`
				: ''
		}</p>`
	}

	return `<div style="margin-top:28px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.55;color:#333;">
<p style="margin:0 0 8px;font-size:12px;font-weight:600;">${escapeHtml(name)}</p>
<p style="margin:0 0 4px;">${addrLine}${supportLine}</p>
${prefBlock}
</div>`
}

function buildTransactionalMinimalBlock(): string {
	const name = companyLegalOrTradingName()
	const support = resolveSupportEmailAddress()
	const address = companyAddressLine()
	const addr = address
		? `<p style="margin:4px 0 0;font-size:11px;color:#555;">${escapeHtml(address)}</p>`
		: ''
	return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;line-height:1.5;color:#555;">
<p style="margin:0 0 4px;">${escapeHtml(name)} &mdash; operational notice</p>
<p style="margin:0;">Contact: <a href="mailto:${escapeAttr(support)}">${escapeHtml(support)}</a></p>
${addr}
<p style="margin:8px 0 0;font-size:10px;color:#777;">This message relates to a booking, payment, or account action. It is not covered by the same
marketing or promotional email settings as general updates; required notices may still be sent.</p>
</div>`
}

/**
 * Renders the appropriate compliance fragment (no outer html/body).
 */
export function renderEmailComplianceFooterFragment(ctx: EmailComplianceFooterContext): string {
	if (ctx.category === 'transactional') {
		return buildTransactionalMinimalBlock()
	}
	return buildFullNonTransactionalBlock(ctx)
}

/**
 * Injects the compliance block before `</body>` if present, else appends to the string.
 */
export function injectEmailComplianceFooter(fullHtml: string, footerFragment: string): string {
	const lower = fullHtml.toLowerCase()
	const idx = lower.lastIndexOf('</body>')
	if (idx === -1) {
		return `${fullHtml}\n${footerFragment}`
	}
	return `${fullHtml.slice(0, idx)}\n${footerFragment}\n${fullHtml.slice(idx)}`
}

/**
 * Composes **category** + **portal** branch and injects the footer.
 */
export function appendComplianceFooterToEmailHtml(
	fullHtml: string,
	ctx: EmailComplianceFooterContext,
): string {
	return injectEmailComplianceFooter(fullHtml, renderEmailComplianceFooterFragment(ctx))
}
