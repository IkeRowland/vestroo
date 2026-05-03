/**
 * Country list for trip-request Slide 3 (lazy-loaded chunk).
 *
 * **Source:** [`country-telephone-data`](https://www.npmjs.com/package/country-telephone-data) (MIT)
 * — ISO-3166 alpha-2 `iso2`, English `name`, and `dialCode` strings used to build `+{dialCode}` prefixes.
 */

export type TripRequestCountryOption = {
  iso2: string
  name: string
  dialCode: string
  dialPrefix: string
}

/**
 * Loads and normalises the full country set (async / dynamic import — not for first paint).
 */
export async function loadTripRequestCountryOptions(): Promise<TripRequestCountryOption[]> {
  const mod = await import('country-telephone-data')
  const raw = mod.allCountries
  const mapped: TripRequestCountryOption[] = raw.map((c) => ({
    iso2: c.iso2.toLowerCase(),
    name: c.name,
    dialCode: c.dialCode,
    dialPrefix: `+${c.dialCode}`,
  }))
  mapped.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return mapped
}
