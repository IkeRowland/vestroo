import { z } from 'zod'

const uuid = z.string().uuid()

/** `event_key` is echoed from the ops list; server re-validates against the loaded row. */
export const loadCommsTemplatePreviewSchema = z
	.object({
		id: uuid,
		event_key: z.string().min(1).max(120),
		channel: z.enum(['email', 'sms']),
	})
	.strict()
