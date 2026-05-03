import countryTelephoneData from 'country-telephone-data';

const ALLOWED_ISO2 = new Set(
  (countryTelephoneData as { allCountries: { iso2: string }[] }).allCountries.map((c) =>
    c.iso2.toLowerCase(),
  ),
);

function normalizeIso2(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim().toUpperCase();
  if (t.length !== 2) return null;
  const lo = t.toLowerCase();
  return ALLOWED_ISO2.has(lo) ? lo : null;
}

/**
 * Infer default phone country (ISO-3166 alpha-2, lower-case) for trip-request slide 3 (FE.19.2).
 * Prefers **IP-derived** country headers when valid, then **Accept-Language** region subtag,
 * then **`za`**.
 */
export function inferTripRequestPhoneCountryIso2(
  acceptLanguage: string | null | undefined,
  ipCountry: string | null | undefined,
): string {
  const fromIp = normalizeIso2(ipCountry);
  if (fromIp) return fromIp;

  if (acceptLanguage && typeof acceptLanguage === 'string') {
    const first = acceptLanguage.split(',')[0]?.trim();
    if (first) {
      const tag = first.split(';')[0]?.trim();
      const m = /^[a-z]{2,3}-([a-z]{2})$/i.exec(tag);
      if (m?.[1]) {
        const fromLang = normalizeIso2(m[1]);
        if (fromLang) return fromLang;
      }
    }
  }

  return 'za';
}
