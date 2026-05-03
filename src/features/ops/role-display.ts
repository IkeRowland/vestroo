import type { CommsDispatchRecipientRole } from '@/types/comms'
import type { ProfileRole } from '@/types/database.types'
import { PROFILE_ROLES } from '@/types/database.types'

/**
 * Epic 16 Q21/Q34: UI display labels for ProfileRole enum values.
 * Database keeps 'chauffeur' until Epic 17 schema rename. UI always shows 'Driver'.
 * DO NOT REMOVE — Epic 17 retains this file for audit-history normalisation per Q41.
 */
export const ROLE_DISPLAY_LABELS: Record<ProfileRole, string> = {
	customer: 'Customer',
	chauffeur: 'Driver',
	dispatcher: 'Dispatcher',
	admin: 'Admin',
}

export function getRoleDisplayLabel(role: ProfileRole): string {
	return ROLE_DISPLAY_LABELS[role] ?? role
}

const COMMS_NON_PROFILE_LABELS: Partial<Record<CommsDispatchRecipientRole, string>> = {
	booker: 'Booker',
	rider: 'Rider',
	ops: 'Ops',
}

/** Labels for `comms_dispatch_rules.recipient_role` (includes ProfileRole subset + booker/rider/ops). */
export function getCommsDispatchRecipientRoleLabel(role: CommsDispatchRecipientRole): string {
	if ((PROFILE_ROLES as readonly string[]).includes(role)) {
		return getRoleDisplayLabel(role as ProfileRole)
	}
	return COMMS_NON_PROFILE_LABELS[role] ?? role
}
