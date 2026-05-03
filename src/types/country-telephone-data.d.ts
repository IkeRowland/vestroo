declare module 'country-telephone-data' {
  export type CountryTelephoneRow = {
    name: string
    iso2: string
    dialCode: string
    format?: string
    priority?: number
    hasAreaCodes?: boolean
  }

  export const allCountries: CountryTelephoneRow[]
  export const iso2Lookup: Record<string, number>
  export const allCountryCodes: Record<string, string[]>
}
