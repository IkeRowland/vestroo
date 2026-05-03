import { z } from 'zod'

import { COMMS_DISPATCH_RECIPIENT_ROLES } from '@/types/comms'

const uuid = z.string().uuid()

export const setCommsDispatchRuleActiveSchema = z
	.object({
		id: uuid,
		active: z.boolean(),
	})
	.strict()

export const setCommsDispatchRuleRecipientRoleSchema = z
	.object({
		id: uuid,
		recipient_role: z.enum(COMMS_DISPATCH_RECIPIENT_ROLES),
	})
	.strict()

export const setCommsDispatchRuleRecipientFilterSchema = z
	.object({
		id: uuid,
		recipient_filter_json: z.string(),
	})
	.strict()

export const setCommsTemplateActiveSchema = z
	.object({
		id: uuid,
		active: z.boolean(),
	})
	.strict()
