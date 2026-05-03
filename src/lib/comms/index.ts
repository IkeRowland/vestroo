/**
 * Epic 15 / **15C.2** — comms matrix dispatch (server-only).
 * Import from `@/lib/comms` for matrix evaluation + sends; registry reads use **service role**.
 */
export {
	auditCommsMatrixPreSendBlocked,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
	type CommsMatrixEmailGate,
	type CommsMatrixEmailSnapshot,
	type SendCommsMatrixEmailDispatchesInput,
	type SendCommsMatrixEmailDispatchesResult,
} from '@/lib/comms/dispatch-email'
export {
	OPS_AUDIT_ACTION_COMMS_DISPATCH_RULE_UPDATED,
	OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE,
	OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED,
	OPS_AUDIT_ACTION_COMMS_TEMPLATE_UPDATED,
	type OpsAuditCommsMatrixAction,
} from '@/lib/comms/audit-actions'
export { getOpsAutomationAuditActorId } from '@/lib/comms/automation-audit-actor'
