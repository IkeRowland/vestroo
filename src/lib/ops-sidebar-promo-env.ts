/**
 * Epic 17 / **FE.17.3** — optional sidebar promo slot (**`OpsSidebarPromoSlot`**).
 *
 * Product flag name: **`ops_sidebar_promo_enabled`** → client env
 * **`NEXT_PUBLIC_OPS_SIDEBAR_PROMO_ENABLED`** (same truthy parsing as dispatch board nav).
 *
 * **Defaults:** unset ⇒ **off** (production-safe). Staging teams set **`=1`** in `.env.staging` / host env.
 *
 * Optional JSON payload: **`NEXT_PUBLIC_OPS_SIDEBAR_PROMO_JSON`**
 * (`{ "title": string, "body"?: string, "href"?: string, "imageUrl"?: string }`).
 */
export function isOpsSidebarPromoEnabled(): boolean {
	const v = process.env.NEXT_PUBLIC_OPS_SIDEBAR_PROMO_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}
