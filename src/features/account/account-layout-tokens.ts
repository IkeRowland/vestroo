/**
 * FE.18.1 — each name must exist under `[data-account-theme='light']` in
 * `src/app/globals.css` (guarded by `account-layout-tokens.test.ts`).
 * Dark account theme is deferred (Story 18.1 / epic reconciliation).
 */
export const ACCOUNT_FE_18_1_CSS_VAR_NAMES = [
	'--account-sidebar-width',
	'--account-sidebar-collapsed-width',
	'--account-canvas',
	'--account-surface',
	'--account-surface-hover',
	'--account-border',
	'--account-foreground',
	'--account-muted',
	'--account-topbar',
	'--account-ring',
	'--account-accent',
	'--account-accent-foreground',
	'--account-accent-soft',
	'--account-success',
	'--account-success-foreground',
	'--account-warning',
	'--account-warning-foreground',
	'--account-danger',
	'--account-danger-foreground',
	'--account-info',
	'--account-info-foreground',
] as const

/**
 * Matches `--account-sidebar-width` / `--account-sidebar-collapsed-width` in
 * `src/app/globals.css` — keep in sync with CSS (14rem / 4.5rem).
 */
export const ACCOUNT_LAYOUT_WIDTHS_REM = {
	sidebarExpanded: 14,
	sidebarCollapsed: 4.5,
} as const
