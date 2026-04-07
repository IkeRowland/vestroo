export type ExperiencePackageAddonDef = {
  id: string
  label: string
  price_zar: number
}

export function parseAddonCatalog(raw: unknown): ExperiencePackageAddonDef[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ExperiencePackageAddonDef[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const o = item as Record<string, unknown>
    const id = String(o.id ?? '')
    const label = String(o.label ?? '')
    const price_zar = Number(o.price_zar)
    if (!id || !label || !Number.isFinite(price_zar) || price_zar < 0) {
      continue
    }
    out.push({ id, label, price_zar })
  }
  return out
}

export type ExperiencePackagePricingInput = {
  base_price_zar: number
  per_passenger_increment_zar: number
  included_passengers: number
  addon_catalog: ExperiencePackageAddonDef[] | null
}

export type ExperienceQuoteLineItem = {
  code: string
  label: string
  amount_zar: number
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Pure package pricing: base + extra passengers + selected add-ons (catalog-validated by caller).
 */
export function computeExperiencePackageQuote(
  pkg: ExperiencePackagePricingInput,
  groupSize: number,
  selectedAddonIds: string[]
): { lineItems: ExperienceQuoteLineItem[]; total_zar: number } {
  if (!Number.isFinite(groupSize) || groupSize < 1) {
    throw new Error('Invalid group size')
  }

  const lineItems: ExperienceQuoteLineItem[] = []
  lineItems.push({
    code: 'package_base',
    label: 'Experience package (base)',
    amount_zar: roundMoney(pkg.base_price_zar),
  })

  const extra = Math.max(0, groupSize - pkg.included_passengers)
  if (extra > 0) {
    const inc = pkg.per_passenger_increment_zar
    lineItems.push({
      code: 'extra_passengers',
      label: `Additional passengers × ${extra}`,
      amount_zar: roundMoney(extra * inc),
    })
  }

  const catalog = pkg.addon_catalog ?? []
  const catalogById = new Map(catalog.map((a) => [a.id, a]))
  for (const addonId of selectedAddonIds) {
    const addon = catalogById.get(addonId)
    if (!addon) {
      throw new Error(`Unknown add-on: ${addonId}`)
    }
    lineItems.push({
      code: `addon:${addon.id}`,
      label: addon.label,
      amount_zar: roundMoney(addon.price_zar),
    })
  }

  const total_zar = roundMoney(
    lineItems.reduce((sum, row) => sum + row.amount_zar, 0)
  )

  return { lineItems, total_zar }
}
