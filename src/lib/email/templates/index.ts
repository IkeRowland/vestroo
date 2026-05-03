import {
	accountMemberInviteTemplateId,
	getAccountMemberInviteStubHtml,
} from './account-member-invite'
import {
	accountTripConfirmationTemplateId,
	getAccountTripConfirmationStubHtml,
} from './account-trip-confirmation'
import { getWalkInQuoteStubHtml, walkInQuoteTemplateId } from './walk-in-quote'

export {
	accountMemberInviteTemplateId,
	getAccountMemberInviteStubHtml,
	buildAccountMemberInviteEmailSubject,
	renderAccountMemberInviteHtml,
	type AccountMemberInviteEmailProps,
} from './account-member-invite'
export {
	accountTripConfirmationTemplateId,
	getAccountTripConfirmationStubHtml,
	renderAccountTripConfirmationHtml,
	type AccountTripConfirmationProps,
} from './account-trip-confirmation'
export {
	walkInQuoteTemplateId,
	getWalkInQuoteStubHtml,
	renderWalkInQuoteHtml,
	buildWalkInQuoteEmailSubject,
	buildWalkInQuotePlaintext,
	type WalkInQuoteEmailProps,
} from './walk-in-quote'

/** Registry id → renderer (stub used for lazy import / smoke until full props wired at call site). */
export const emailTemplateRegistry = {
	[accountTripConfirmationTemplateId]: getAccountTripConfirmationStubHtml,
	[walkInQuoteTemplateId]: getWalkInQuoteStubHtml,
	[accountMemberInviteTemplateId]: getAccountMemberInviteStubHtml,
} as const
