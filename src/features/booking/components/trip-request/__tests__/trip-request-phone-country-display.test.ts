import { describe, expect, it } from 'vitest';

import { dialPrefixFromIso2, flagEmojiFromIso2 } from '../trip-request-phone-country-display';

describe('trip-request-phone-country-display', () => {
  it('returns +27 for South Africa (lowercase iso2)', () => {
    expect(dialPrefixFromIso2('za')).toBe('+27');
  });

  it('returns a regional-indicator flag pair for ZA', () => {
    const f = flagEmojiFromIso2('za');
    expect(f.length).toBeGreaterThanOrEqual(2);
  });
});
