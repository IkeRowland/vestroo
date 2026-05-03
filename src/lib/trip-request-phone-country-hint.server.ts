import { headers } from 'next/headers';

import { inferTripRequestPhoneCountryIso2 } from '@/lib/infer-trip-request-phone-country.server';

/**
 * Reads deployment geolocation / `Accept-Language` headers (FE.19.2) for trip-request phone country.
 */
export async function getTripRequestPhoneCountryIso2FromHeaders(): Promise<string> {
  const h = await headers();
  const acceptLanguage = h.get('accept-language');
  const ipCountry =
    h.get('cf-ipcountry') ||
    h.get('x-vercel-ip-country') ||
    h.get('x-country-code') ||
    h.get('cloudfront-viewer-country');
  return inferTripRequestPhoneCountryIso2(acceptLanguage, ipCountry);
}
