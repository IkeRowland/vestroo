/**
 * FE.17.1 — each token must exist under both `[data-ops-theme='light']` and
 * `[data-ops-theme='dark']` in `src/app/globals.css` (guarded by
 * `ops-layout-tokens.test.ts`).
 */
export const OPS_FE_17_1_CSS_VAR_NAMES = [
	'--ops-accent',
	'--ops-accent-foreground',
	'--ops-accent-soft',
	'--ops-success',
	'--ops-success-foreground',
	'--ops-warning',
	'--ops-warning-foreground',
	'--ops-danger',
	'--ops-danger-foreground',
	'--ops-info',
	'--ops-info-foreground',
	'--ops-elevation-1',
	'--ops-elevation-2',
	'--ops-radius-card',
	'--ops-radius-pill',
	'--ops-chart-1',
	'--ops-chart-2',
	'--ops-chart-3',
	'--ops-chart-4',
	'--ops-chart-5',
	'--ops-chart-6',
] as const

/**
 * Layout numbers documented to match `[data-ops-theme]` in `src/app/globals.css`
 * (`--ops-sidebar-width`, `--ops-sidebar-collapsed-width`). Change CSS and this file together.
 */
export const OPS_LAYOUT_WIDTHS_REM = {
	/** Expanded sidebar (md+), matches `w-ops-sidebar` / 14rem */
	sidebarExpanded: 14,
	/** Collapsed icon rail (md+), matches `w-ops-sidebar-collapsed` / 4.5rem */
	sidebarCollapsed: 4.5,
} as const
