'use server'



import { revalidatePath } from 'next/cache'

import { z } from 'zod'



import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'

import { mintPendingAccountInviteAcceptUrl, rotateInviteTokenAndSendEmail } from '@/lib/account-invite-send'

import { appendOpsAuditLog } from '@/lib/ops-audit'

import { getOpsStaffForAction } from '@/lib/ops-auth'

import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'

import { createUserServerClient } from '@/lib/supabase/server'

import type { CustomerAccountStatusDb, ProfileRole } from '@/types/database.types'



const slugRe = /^[a-z0-9](?:[a-z0-9-]{0,79})$/



const accountStatusSchema = z.enum(['active', 'on_hold', 'suspended', 'closed'])



const createAccountClientSchema = z

	.object({

		name: z.string().trim().min(2).max(120),

		slug: z

			.string()

			.trim()

			.toLowerCase()

			.regex(slugRe, 'Slug must be lowercase letters, numbers, or hyphens'),

		authorizedEmailDomains: z.array(z.string().trim().toLowerCase()).optional().default([]),

		creditTermsDays: z.number().int().min(0).max(365).optional().default(0),

		creditLimitZar: z.number().nonnegative().optional().nullable(),

		initialAdminEmail: z.string().trim().max(320).optional().default(''),

		sendInitialAdminInvite: z.boolean().optional().default(false),

	})

	.superRefine((val, ctx) => {

		const e = val.initialAdminEmail?.trim() ?? ''

		if (e.length === 0) return

		const parsed = z.string().email().safeParse(e)

		if (!parsed.success) {

			ctx.addIssue({

				code: z.ZodIssueCode.custom,

				message: 'Enter a valid admin email or leave the field empty.',

				path: ['initialAdminEmail'],

			})

		}

	})



export type CreateAccountClientInput = z.input<typeof createAccountClientSchema>



export type CreateAccountClientSuccess = {

	ok: true

	accountId: string

	/** When an initial admin was added without sending email, share this link manually. */

	initialAdminInviteUrl?: string

	/** Shown when invite email was requested but could not be sent (account still created). */

	initialAdminInviteEmailWarning?: string

}



const updateAccountClientSchema = z
	.object({
		accountId: z.string().uuid(),
		name: z.string().trim().min(2).max(120),
		slug: z
			.string()
			.trim()
			.toLowerCase()
			.regex(slugRe, 'Slug must be lowercase letters, numbers, or hyphens'),
		authorizedEmailDomains: z.array(z.string().trim().toLowerCase()).optional().default([]),
		creditTermsDays: z.number().int().min(0).max(365),
		creditLimitZar: z.number().nonnegative().nullable(),
		status: accountStatusSchema,
		contractStartsOn: z.string().trim().optional().nullable(),
		contractEndsOn: z.string().trim().optional().nullable(),
		initialAdminEmail: z.string().trim().max(320).optional().default(''),
		sendInitialAdminInvite: z.boolean().optional().default(false),
	})
	.superRefine((val, ctx) => {
		const e = val.initialAdminEmail?.trim() ?? ''
		if (e.length === 0) return
		const parsed = z.string().email().safeParse(e)
		if (!parsed.success) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Enter a valid admin email or leave the field empty.',
				path: ['initialAdminEmail'],
			})
		}
	})

export type UpdateAccountClientInput = z.input<typeof updateAccountClientSchema>

export type UpdateAccountClientSuccess = {
	ok: true
	initialAdminInviteUrl?: string
	initialAdminInviteEmailWarning?: string
}



function staffActorRole(role: ProfileRole): 'admin' | 'dispatcher' {

	return role === 'admin' ? 'admin' : 'dispatcher'

}



async function deleteCustomerAccountCascade(

	supabase: Awaited<ReturnType<typeof createUserServerClient>>,

	accountId: string,

): Promise<void> {

	await supabase.from('customer_accounts').delete().eq('id', accountId)

}



export async function createAccountClientAction(

	raw: CreateAccountClientInput,

): Promise<CreateAccountClientSuccess | ReturnType<typeof buildOpsActionFailure>> {

	const correlationId = newOpsCorrelationId()

	const parsed = createAccountClientSchema.safeParse(raw)

	if (!parsed.success) {

		logOpsAction({

			action: 'createAccountClientAction',

			outcome: 'validation_error',

			level: 'warn',

			correlationId,

			code: 'VALIDATION',

		})

		return buildOpsActionFailure(

			'VALIDATION',

			parsed.error.issues[0]?.message ?? 'Invalid payload',

			correlationId,

		)

	}



	const gate = await getOpsStaffForAction()

	if (!gate.ok) {

		logOpsAction({

			action: 'createAccountClientAction',

			outcome: 'forbidden',

			level: 'warn',

			correlationId,

			code: 'FORBIDDEN',

			hint: gate.message,

		})

		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)

	}



	const staff = gate.session

	const supabase = await createUserServerClient()



	const { data: existing } = await supabase

		.from('customer_accounts')

		.select('id')

		.eq('slug', parsed.data.slug)

		.maybeSingle()

	if (existing?.id) {

		return buildOpsActionFailure(

			'CONFLICT',

			'An account with this slug already exists. Choose another slug.',

			correlationId,

		)

	}



	const { data: created, error: insErr } = await supabase

		.from('customer_accounts')

		.insert({

			name: parsed.data.name,

			slug: parsed.data.slug,

			status: 'active',

			authorized_email_domains: parsed.data.authorizedEmailDomains ?? [],

			credit_terms_days: parsed.data.creditTermsDays ?? 0,

			credit_limit_zar: parsed.data.creditLimitZar ?? null,

			created_by: staff.userId,

		})

		.select('id')

		.single()



	if (insErr || !created?.id) {

		logOpsAction({

			action: 'createAccountClientAction',

			outcome: 'failure',

			level: 'error',

			correlationId,

			code: 'DATABASE',

			hint: insErr?.message,

		})

		return buildOpsActionFailure(

			'DATABASE',

			insErr?.message ?? 'Could not create account.',

			correlationId,

		)

	}



	const accountId = created.id as string



	const adminEmail = (parsed.data.initialAdminEmail ?? '').trim().toLowerCase()

	let initialAdminInviteUrl: string | undefined

	let initialAdminInviteEmailWarning: string | undefined



	if (adminEmail.length > 0) {

		const { error: memInsErr } = await supabase.from('customer_account_members').insert({

			account_id: accountId,

			email: adminEmail,

			role: 'admin',

			profile_id: null,

			accepted_at: null,

			invited_at: new Date().toISOString(),

		})



		if (memInsErr) {

			await deleteCustomerAccountCascade(supabase, accountId)

			const msg =

				memInsErr.code === '23505'

					? 'That email is already a member of this account.'

					: memInsErr.message ?? 'Could not add initial admin.'

			logOpsAction({

				action: 'createAccountClientAction',

				outcome: 'failure',

				level: 'error',

				correlationId,

				code: 'DATABASE',

				hint: memInsErr.message,

			})

			return buildOpsActionFailure('DATABASE', msg, correlationId)

		}



		const memberAudit = await appendOpsAuditLog(supabase, {

			actorId: staff.userId,

			actorRole: staffActorRole(staff.role),

			action: 'ops_create_customer_account_initial_admin',

			entity: 'customer_account_members',

			entityId: accountId,

			payload: { account_id: accountId, target_email: adminEmail, role: 'admin' },

		})

		if (!memberAudit.ok) {

			await supabase.from('customer_account_members').delete().eq('account_id', accountId).eq('email', adminEmail)

			await deleteCustomerAccountCascade(supabase, accountId)

			return buildOpsActionFailure(

				'DATABASE',

				'Could not record audit log; account was not created. Try again.',

				correlationId,

			)

		}



		const accountName = parsed.data.name.trim() || 'Your organisation'



		if (parsed.data.sendInitialAdminInvite) {

			const emailResult = await rotateInviteTokenAndSendEmail({

				supabase,

				accountId,

				memberEmailDb: adminEmail,

				memberRole: 'admin',

				accountName,

				inviterUserId: staff.userId,

				enforceCooldown: false,

				lastSentAtIso: null,

			})

			if (!emailResult.ok) {

				initialAdminInviteEmailWarning = emailResult.message

			}

		} else {

			const minted = await mintPendingAccountInviteAcceptUrl({

				supabase,

				accountId,

				memberEmailDb: adminEmail,

				memberRole: 'admin',

				accountName,

				inviterUserId: staff.userId,

			})

			if (!minted.ok) {

				await supabase.from('customer_account_members').delete().eq('account_id', accountId).eq('email', adminEmail)

				await deleteCustomerAccountCascade(supabase, accountId)

				return buildOpsActionFailure(

					'DATABASE',

					minted.message ?? 'Could not prepare invite link for the initial admin.',

					correlationId,

				)

			}

			initialAdminInviteUrl = minted.acceptUrl

		}

	}



	await appendOpsAuditLog(supabase, {

		actorId: staff.userId,

		actorRole: staffActorRole(staff.role),

		action: 'create_customer_account',

		entity: 'customer_account',

		entityId: accountId,

		payload: {

			slug: parsed.data.slug,

			name: parsed.data.name,

			...(adminEmail ? { initial_admin_email: adminEmail, invite_sent: parsed.data.sendInitialAdminInvite } : {}),

		},

	})



	revalidatePath('/ops/clients')



	logOpsAction({

		action: 'createAccountClientAction',

		outcome: 'success',

		level: 'info',

		correlationId,

	})

	return {

		ok: true as const,

		accountId,

		...(initialAdminInviteUrl ? { initialAdminInviteUrl } : {}),

		...(initialAdminInviteEmailWarning ? { initialAdminInviteEmailWarning } : {}),

	}

}



function parseOptionalDateOnly(raw: string | null | undefined): string | null {

	if (raw == null) return null

	const t = raw.trim()

	if (t.length === 0) return null

	const d = new Date(`${t}T12:00:00.000Z`)

	if (Number.isNaN(d.getTime())) return null

	return t

}



export async function updateAccountClientAction(
	raw: UpdateAccountClientInput,
): Promise<UpdateAccountClientSuccess | ReturnType<typeof buildOpsActionFailure>> {

	const correlationId = newOpsCorrelationId()

	const parsed = updateAccountClientSchema.safeParse(raw)

	if (!parsed.success) {

		logOpsAction({

			action: 'updateAccountClientAction',

			outcome: 'validation_error',

			level: 'warn',

			correlationId,

			code: 'VALIDATION',

		})

		return buildOpsActionFailure(

			'VALIDATION',

			parsed.error.issues[0]?.message ?? 'Invalid payload',

			correlationId,

		)

	}



	const gate = await getOpsStaffForAction()

	if (!gate.ok) {

		logOpsAction({

			action: 'updateAccountClientAction',

			outcome: 'forbidden',

			level: 'warn',

			correlationId,

			code: 'FORBIDDEN',

			hint: gate.message,

		})

		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)

	}



	const staff = gate.session

	const supabase = await createUserServerClient()

	const accountId = parsed.data.accountId



	const { data: existingRow, error: loadErr } = await supabase

		.from('customer_accounts')

		.select('id, slug')

		.eq('id', accountId)

		.maybeSingle()



	if (loadErr || !existingRow?.id) {

		return buildOpsActionFailure('NOT_FOUND', 'Account not found.', correlationId)

	}



	if (existingRow.slug !== parsed.data.slug) {

		const { data: slugHit } = await supabase

			.from('customer_accounts')

			.select('id')

			.eq('slug', parsed.data.slug)

			.neq('id', accountId)

			.maybeSingle()

		if (slugHit?.id) {

			return buildOpsActionFailure(

				'CONFLICT',

				'Another account already uses this slug. Choose a different slug.',

				correlationId,

			)

		}

	}



	const adminEmail = (parsed.data.initialAdminEmail ?? '').trim().toLowerCase()

	if (adminEmail.length > 0) {
		const { data: dupMember } = await supabase
			.from('customer_account_members')
			.select('email')
			.eq('account_id', accountId)
			.eq('email', adminEmail)
			.maybeSingle()
		if (dupMember?.email) {
			return buildOpsActionFailure(
				'CONFLICT',
				'This email is already a member of this account.',
				correlationId,
			)
		}
	}

	const contractStartsOn = parseOptionalDateOnly(parsed.data.contractStartsOn ?? null)

	const contractEndsOn = parseOptionalDateOnly(parsed.data.contractEndsOn ?? null)

	const { error: updErr } = await supabase
		.from('customer_accounts')
		.update({
			name: parsed.data.name,
			slug: parsed.data.slug,
			authorized_email_domains: parsed.data.authorizedEmailDomains ?? [],
			credit_terms_days: parsed.data.creditTermsDays,
			credit_limit_zar: parsed.data.creditLimitZar,
			status: parsed.data.status as CustomerAccountStatusDb,
			contract_starts_on: contractStartsOn,
			contract_ends_on: contractEndsOn,
		})
		.eq('id', accountId)

	if (updErr) {
		logOpsAction({
			action: 'updateAccountClientAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: updErr.message,
		})
		return buildOpsActionFailure('DATABASE', updErr.message ?? 'Could not update account.', correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'update_customer_account',
		entity: 'customer_account',
		entityId: accountId,
		payload: { slug: parsed.data.slug, name: parsed.data.name },
	})

	let initialAdminInviteUrl: string | undefined
	let initialAdminInviteEmailWarning: string | undefined

	if (adminEmail.length > 0) {
		const { error: memInsErr } = await supabase.from('customer_account_members').insert({
			account_id: accountId,
			email: adminEmail,
			role: 'admin',
			profile_id: null,
			accepted_at: null,
			invited_at: new Date().toISOString(),
		})

		if (memInsErr) {
			const msg =
				memInsErr.code === '23505'
					? 'That email is already a member of this account.'
					: memInsErr.message ?? 'Could not add admin member.'
			logOpsAction({
				action: 'updateAccountClientAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				hint: memInsErr.message,
			})
			return buildOpsActionFailure('DATABASE', msg, correlationId)
		}

		const memberAudit = await appendOpsAuditLog(supabase, {
			actorId: staff.userId,
			actorRole: staffActorRole(staff.role),
			action: 'ops_create_customer_account_initial_admin',
			entity: 'customer_account_members',
			entityId: accountId,
			payload: { account_id: accountId, target_email: adminEmail, role: 'admin', context: 'ops_update' },
		})
		if (!memberAudit.ok) {
			await supabase.from('customer_account_members').delete().eq('account_id', accountId).eq('email', adminEmail)
			return buildOpsActionFailure(
				'DATABASE',
				'Could not record audit log; the admin member was not added. Other changes were saved.',
				correlationId,
			)
		}

		const accountName = parsed.data.name.trim() || 'Your organisation'

		if (parsed.data.sendInitialAdminInvite) {
			const emailResult = await rotateInviteTokenAndSendEmail({
				supabase,
				accountId,
				memberEmailDb: adminEmail,
				memberRole: 'admin',
				accountName,
				inviterUserId: staff.userId,
				enforceCooldown: false,
				lastSentAtIso: null,
			})
			if (!emailResult.ok) {
				initialAdminInviteEmailWarning = emailResult.message
			}
		} else {
			const minted = await mintPendingAccountInviteAcceptUrl({
				supabase,
				accountId,
				memberEmailDb: adminEmail,
				memberRole: 'admin',
				accountName,
				inviterUserId: staff.userId,
			})
			if (!minted.ok) {
				await supabase.from('customer_account_members').delete().eq('account_id', accountId).eq('email', adminEmail)
				return buildOpsActionFailure(
					'DATABASE',
					minted.message ?? 'Could not prepare invite link for the admin. Other account changes were saved.',
					correlationId,
				)
			}
			initialAdminInviteUrl = minted.acceptUrl
		}
	}

	revalidatePath('/ops/clients')

	logOpsAction({
		action: 'updateAccountClientAction',
		outcome: 'success',
		level: 'info',
		correlationId,
	})
	return {
		ok: true as const,
		...(initialAdminInviteUrl ? { initialAdminInviteUrl } : {}),
		...(initialAdminInviteEmailWarning ? { initialAdminInviteEmailWarning } : {}),
	}
}


