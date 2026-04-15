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
