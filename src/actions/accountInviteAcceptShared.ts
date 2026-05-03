export type FinalizeInviteState =
	| { ok: true; message: string | null }
	| { ok: false; message: string }

export const initialFinalizeInviteState: FinalizeInviteState = { ok: true, message: null }
