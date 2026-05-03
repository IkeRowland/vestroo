/**
 * Epic 15 / **15C.2** — `ops_audit_log.action` values for comms matrix outcomes.
 * Keep in sync with staff/account insert policy whitelists when adding new actions.
 */
export const OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED = 'comms_no_rule_matched' as const
export const OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE = 'comms_no_active_template' as const

/** Epic 15 / **15C.3** — ops registry edits (`/ops/comms`). */
export const OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED =
	'comms_dispatch_rule_updated' as const
export const OPS_AUDIT_ACTION_COMMS_TEMPLATE_UPDATED =
	'comms_template_updated' as const

export type OpsAuditCommsMatrixAction =
	| typeof OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED
	| typeof OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE
	| typeof OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED
	| typeof OPS_AUDIT_ACTION_COMMS_TEMPLATE_UPDATED
