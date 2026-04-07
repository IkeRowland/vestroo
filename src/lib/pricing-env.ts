/**
 * Premium chauffeured defaults — not public-transit scale.
 * Override with env vars per docs/environment-vars.md.
 */

export function getPricingBasePricePerKm(): number {
  const raw = process.env.PRICING_BASE_PRICE_PER_KM
  if (raw === undefined || raw === '') {
    return 22
  }
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return 22
  }
  return n
}

export function getPricingHourlyMinimumHours(): number {
  const raw = process.env.PRICING_HOURLY_MINIMUM_HOURS
  if (raw === undefined || raw === '') {
    return 3
  }
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return 3
  }
  return n
}

/** ZAR per hour before vehicle multiplier (premium dedicated hire baseline). */
export function getPricingHourlyBaseRateZar(): number {
  const raw = process.env.PRICING_HOURLY_BASE_RATE_ZAR
  if (raw === undefined || raw === '') {
    return 520
  }
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return 520
  }
  return n
}

/** ZAR amount — reconciled totals must match within this band (rounding). */
export const QUOTE_RECONCILE_TOLERANCE_ZAR = 0.02
