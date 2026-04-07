import { describe, it, expect } from 'vitest'
import {
  computeExperiencePackageQuote,
  parseAddonCatalog,
} from '@/lib/experience-package-quote'

describe('computeExperiencePackageQuote', () => {
  it('sums base, extra passengers, and add-ons', () => {
    const { lineItems, total_zar } = computeExperiencePackageQuote(
      {
        base_price_zar: 1000,
        per_passenger_increment_zar: 100,
        included_passengers: 2,
        addon_catalog: [
          { id: 'a1', label: 'Wine tasting upgrade', price_zar: 250 },
        ],
      },
      4,
      ['a1']
    )
    expect(lineItems).toHaveLength(3)
    expect(lineItems[0].amount_zar).toBe(1000)
    expect(lineItems[1].code).toBe('extra_passengers')
    expect(lineItems[1].amount_zar).toBe(200)
    expect(lineItems[2].amount_zar).toBe(250)
    expect(total_zar).toBe(1450)
  })

  it('rejects unknown add-on ids', () => {
    expect(() =>
      computeExperiencePackageQuote(
        {
          base_price_zar: 500,
          per_passenger_increment_zar: 0,
          included_passengers: 1,
          addon_catalog: [],
        },
        1,
        ['nope']
      )
    ).toThrow(/Unknown add-on/)
  })
})

describe('parseAddonCatalog', () => {
  it('parses valid catalog entries', () => {
    const rows = parseAddonCatalog([
      { id: 'x', label: 'Test', price_zar: 12.5 },
      { id: '', label: 'Bad', price_zar: 1 },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('x')
  })
})
