'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { accountProfileCopy } from '@/features/account/copy/account-profile-copy'
import { joinProfileFullName } from '@/features/account/lib/account-profile-name'
import { accountProfilePhoneToE164 } from '@/features/account/lib/account-profile-phone'
import { loadEligibleMemberships } from '@/lib/account-portal-auth'
import { isAccountProfileAvatarUploadEnabled } from '@/lib/account-profile-env'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CountryCode } from 'libphonenumber-js'

const ACCOUNT_PROFILE_AVATARS_BUCKET = 'account_profile_avatars' as const
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

const profileNamePhoneSchema = z.object({
	firstName: z.string().trim().min(1, accountProfileCopy.personalErrorFirstNameRequired).max(80),
	lastName: z.string().trim().max(80),
	phone: z.string().trim().max(40),
})

const passwordChangeSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(8),
	confirmPassword: z.string().min(1),
})

function defaultPhoneCountry(): CountryCode {
	const c = (process.env.SMS_DEFAULT_COUNTRY || 'ZA').trim().toUpperCase()
	if (c.length === 2) return c as CountryCode
	return 'ZA'
}

async function requirePortalMemberForProfile(): Promise<
	| { ok: true; supabase: Awaited<ReturnType<typeof createUserServerClient>>; userId: string; email: string }
	| { ok: false }
> {
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user?.email) return { ok: false }
	const memberships = await loadEligibleMemberships(user.id)
	if (memberships.length === 0) return { ok: false }
	return { ok: true, supabase, userId: user.id, email: user.email }
}

export type AccountProfileNamePhoneFormState = { ok: boolean | null; message: string | null }

export const initialAccountProfileNamePhoneFormState: AccountProfileNamePhoneFormState = {
	ok: null,
	message: null,
}

export async function updateAccountProfileNamePhoneAction(
	_prev: AccountProfileNamePhoneFormState,
	formData: FormData,
): Promise<AccountProfileNamePhoneFormState> {
	const gate = await requirePortalMemberForProfile()
	if (!gate.ok) {
		return { ok: false, message: accountProfileCopy.gateNoSession }
	}
	const { supabase, userId } = gate

	const parsed = profileNamePhoneSchema.safeParse({
		firstName: formData.get('first_name'),
		lastName: formData.get('last_name'),
		phone: formData.get('phone'),
	})
	if (!parsed.success) {
		const fe = parsed.error.flatten().fieldErrors
		const msg =
			fe.firstName?.[0] ?? fe.lastName?.[0] ?? fe.phone?.[0] ?? accountProfileCopy.personalErrorForm
		return { ok: false, message: msg }
	}

	const e164 = accountProfilePhoneToE164(parsed.data.phone, defaultPhoneCountry())
	if (e164 === null) {
		return { ok: false, message: accountProfileCopy.personalErrorPhone }
	}

	const fullName = joinProfileFullName(parsed.data.firstName, parsed.data.lastName)

	const { error } = await supabase
		.from('profiles')
		.update({ full_name: fullName, phone: e164 })
		.eq('id', userId)

	if (error) {
		return { ok: false, message: accountProfileCopy.personalErrorGeneric }
	}

	revalidatePath('/account/profile')
	return { ok: true, message: null }
}

export type AccountProfilePasswordFormState = { ok: boolean | null; message: string | null }

export const initialAccountProfilePasswordFormState: AccountProfilePasswordFormState = {
	ok: null,
	message: null,
}

export async function changeAccountPasswordAction(
	_prev: AccountProfilePasswordFormState,
	formData: FormData,
): Promise<AccountProfilePasswordFormState> {
	const gate = await requirePortalMemberForProfile()
	if (!gate.ok) {
		return { ok: false, message: accountProfileCopy.gateNoSession }
	}
	const { supabase, email } = gate

	const parsed = passwordChangeSchema.safeParse({
		currentPassword: formData.get('current_password'),
		newPassword: formData.get('new_password'),
		confirmPassword: formData.get('confirm_password'),
	})
	if (!parsed.success) {
		return { ok: false, message: accountProfileCopy.passwordErrorWeak }
	}
	if (parsed.data.newPassword !== parsed.data.confirmPassword) {
		return { ok: false, message: accountProfileCopy.passwordErrorMismatch }
	}

	const { error: signErr } = await supabase.auth.signInWithPassword({
		email,
		password: parsed.data.currentPassword,
	})
	if (signErr) {
		return { ok: false, message: accountProfileCopy.passwordErrorWrongCurrent }
	}

	const { error: updErr } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
	if (updErr) {
		return { ok: false, message: accountProfileCopy.passwordErrorGeneric }
	}

	revalidatePath('/account/profile')
	return { ok: true, message: null }
}

export type AccountProfileAvatarFormState = { ok: boolean | null; message: string | null }

export const initialAccountProfileAvatarFormState: AccountProfileAvatarFormState = {
	ok: null,
	message: null,
}

const allowedAvatarMime = new Set(['image/jpeg', 'image/png', 'image/webp'])

function extForMime(mime: string): string | null {
	if (mime === 'image/jpeg') return 'jpg'
	if (mime === 'image/png') return 'png'
	if (mime === 'image/webp') return 'webp'
	return null
}

export async function uploadAccountAvatarAction(
	_prev: AccountProfileAvatarFormState,
	formData: FormData,
): Promise<AccountProfileAvatarFormState> {
	if (!isAccountProfileAvatarUploadEnabled()) {
		return { ok: false, message: accountProfileCopy.avatarErrorDisabled }
	}

	const gate = await requirePortalMemberForProfile()
	if (!gate.ok) {
		return { ok: false, message: accountProfileCopy.gateNoSession }
	}
	const { supabase, userId } = gate

	const file = formData.get('avatar')
	if (!(file instanceof File) || file.size === 0) {
		return { ok: false, message: accountProfileCopy.avatarErrorChooseFile }
	}
	if (file.size > AVATAR_MAX_BYTES) {
		return { ok: false, message: accountProfileCopy.avatarErrorTooLarge }
	}
	const mime = file.type
	if (!allowedAvatarMime.has(mime)) {
		return { ok: false, message: accountProfileCopy.avatarErrorFormat }
	}
	const ext = extForMime(mime)
	if (!ext) {
		return { ok: false, message: accountProfileCopy.avatarErrorFormat }
	}

	const objectPath = `${userId}/${randomUUID()}.${ext}`
	const buf = Buffer.from(await file.arrayBuffer())

	const { error: upErr } = await supabase.storage
		.from(ACCOUNT_PROFILE_AVATARS_BUCKET)
		.upload(objectPath, buf, {
			contentType: mime,
			upsert: false,
		})

	if (upErr) {
		return { ok: false, message: accountProfileCopy.avatarErrorGeneric }
	}

	const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
	if (!base) {
		return { ok: false, message: accountProfileCopy.avatarErrorServerConfig }
	}
	const publicUrl = `${base}/storage/v1/object/public/${ACCOUNT_PROFILE_AVATARS_BUCKET}/${objectPath}`

	const { error: profErr } = await supabase
		.from('profiles')
		.update({ avatar_url: publicUrl })
		.eq('id', userId)

	if (profErr) {
		return { ok: false, message: accountProfileCopy.avatarErrorGeneric }
	}

	revalidatePath('/account/profile')
	return { ok: true, message: null }
}
