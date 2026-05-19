/** Stored **`profiles.avatar_object_position`** values (CSS `object-position`). */
export const OPS_DRIVER_AVATAR_OBJECT_POSITIONS = [
	'center',
	'top',
	'bottom',
	'left',
	'right',
	'top left',
	'top right',
	'bottom left',
	'bottom right',
] as const

export type OpsDriverAvatarObjectPosition = (typeof OPS_DRIVER_AVATAR_OBJECT_POSITIONS)[number]

export function normalizeOpsDriverAvatarObjectPosition(raw: string | null | undefined): OpsDriverAvatarObjectPosition {
	const t = (raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
	for (const p of OPS_DRIVER_AVATAR_OBJECT_POSITIONS) {
		if (t === p) return p
	}
	return 'center'
}
