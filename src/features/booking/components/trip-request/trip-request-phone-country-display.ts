import { getCountryCallingCode } from 'libphonenumber-js/min';
import type { CountryCode } from 'libphonenumber-js';

/** Dial prefix for UI (FE.19.7) — uses libphonenumber metadata; no `country-telephone-data` import. */
export function dialPrefixFromIso2(iso2: string | null | undefined): string | null {
  if (!iso2 || iso2.length < 2) return null;
  try {
    const code = getCountryCallingCode(iso2.toUpperCase() as CountryCode);
    return `+${code}`;
  } catch {
    return null;
  }
}

/** Regional-indicator pair for a two-letter ISO-3166 alpha-2 code (lowercase ok). */
export function flagEmojiFromIso2(iso2: string | null | undefined): string {
  if (!iso2 || iso2.length < 2) return '🏳️';
  const upper = iso2.toUpperCase().slice(0, 2);
  const a = 0x1f1e6;
  const chars = [...upper];
  if (chars.length !== 2) return '🏳️';
  const [c0, c1] = chars;
  if (!c0 || !c1 || c0 < 'A' || c0 > 'Z' || c1 < 'A' || c1 > 'Z') return '🏳️';
  return String.fromCodePoint(a + c0.charCodeAt(0) - 65, a + c1.charCodeAt(0) - 65);
}
