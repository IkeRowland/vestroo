'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { joinProfileFullName } from '@/features/account/lib/account-profile-name'
import { accountProfilePhoneToE164 } from '@/features/account/lib/account-profile-phone'
import { opsProfileCopy } from '@/features/ops/copy/ops-profile-copy'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CountryCode } from 'libphonenumber-js'

const profileNamePhoneSchema = z.object({
	firstName: z.string().trim().min(1, opsProfileCopy.personalErrorFirstNameRequired).max(80),
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

async function requireOpsStaffForProfile(): Promise<
	| { ok: true; supabase: Awaited<ReturnType<typeof createUserServerClient>>; userId: string; email: string }
	| { ok: false }
> {
	const gate = await getOpsStaffForAction()
	if (!gate.ok) return { ok: false }
	const supabase = await createUserServerClient()
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser()
	if (userErr || !user?.email) return { ok: false }
	return { ok: true, supabase, userId: gate.session.userId, email: user.email }
}

export type OpsProfileNamePhoneFormState = { ok: boolean | null; message: string | null }

export const initialOpsProfileNamePhoneFormState: OpsProfileNamePhoneFormState = {
	ok: null,
	message: null,
}

export async function updateOpsProfileNamePhoneAction(
	_prev: OpsProfileNamePhoneFormState,
	formData: FormData,
): Promise<OpsProfileNamePhoneFormState> {
	const gate = await requireOpsStaffForProfile()
	if (!gate.ok) {
		return { ok: false, message: opsProfileCopy.gateNoSession }
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
			fe.firstName?.[0] ?? fe.lastName?.[0] ?? fe.phone?.[0] ?? opsProfileCopy.personalErrorForm
		return { ok: false, message: msg }
	}

	const e164 = accountProfilePhoneToE164(parsed.data.phone, defaultPhoneCountry())
	if (e164 === null) {
		return { ok: false, message: opsProfileCopy.personalErrorPhone }
	}

	const fullName = joinProfileFullName(parsed.data.firstName, parsed.data.lastName)

	const { error } = await supabase
		.from('profiles')
		.update({ full_name: fullName, phone: e164 })
		.eq('id', userId)

	if (error) {
		return { ok: false, message: opsProfileCopy.personalErrorGeneric }
	}

	revalidatePath('/ops/profile')
	return { ok: true, message: null }
}

export type OpsProfilePasswordFormState = { ok: boolean | null; message: string | null }

export const initialOpsProfilePasswordFormState: OpsProfilePasswordFormState = {
	ok: null,
	message: null,
}

export async function changeOpsProfilePasswordAction(
	_prev: OpsProfilePasswordFormState,
	formData: FormData,
): Promise<OpsProfilePasswordFormState> {
	const gate = await requireOpsStaffForProfile()
	if (!gate.ok) {
		return { ok: false, message: opsProfileCopy.gateNoSession }
	}
	const { supabase, email } = gate

	const parsed = passwordChangeSchema.safeParse({
		currentPassword: formData.get('current_password'),
		newPassword: formData.get('new_password'),
		confirmPassword: formData.get('confirm_password'),
	})
	if (!parsed.success) {
		return { ok: false, message: opsProfileCopy.passwordErrorWeak }
	}
	if (parsed.data.newPassword !== parsed.data.confirmPassword) {
		return { ok: false, message: opsProfileCopy.passwordErrorMismatch }
	}

	const { error: signErr } = await supabase.auth.signInWithPassword({
		email,
		password: parsed.data.currentPassword,
	})
	if (signErr) {
		return { ok: false, message: opsProfileCopy.passwordErrorWrongCurrent }
	}

	const { error: updErr } = await supabase.auth.updateUser({ password: parsed.data.newPassword })
	if (updErr) {
		return { ok: false, message: opsProfileCopy.passwordErrorGeneric }
	}

	revalidatePath('/ops/profile')
	return { ok: true, message: null }
}
