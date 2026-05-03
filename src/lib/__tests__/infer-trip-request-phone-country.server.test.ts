import { describe, expect, it } from 'vitest';

import { inferTripRequestPhoneCountryIso2 } from '../infer-trip-request-phone-country.server';

describe('inferTripRequestPhoneCountryIso2', () => {
  it('prefers a valid IP country header', () => {
    expect(inferTripRequestPhoneCountryIso2('en-US', 'DE')).toBe('de');
  });

  it('falls back to Accept-Language region', () => {
    expect(inferTripRequestPhoneCountryIso2('fr-FR', null)).toBe('fr');
  });

  it('returns za when nothing matches', () => {
    expect(inferTripRequestPhoneCountryIso2(null, null)).toBe('za');
    expect(inferTripRequestPhoneCountryIso2('xx', 'ZZ')).toBe('za');
  });
});
