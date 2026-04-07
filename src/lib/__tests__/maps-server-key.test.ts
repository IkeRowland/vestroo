import { describe, it, expect, afterEach } from 'vitest';
import { getGoogleMapsServerApiKey } from '@/lib/maps';

describe('getGoogleMapsServerApiKey', () => {
  afterEach(() => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
  });

  it('returns trimmed server key when set', () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = '  server-key  ';
    expect(getGoogleMapsServerApiKey()).toBe('server-key');
  });

  it('returns undefined when unset', () => {
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    expect(getGoogleMapsServerApiKey()).toBeUndefined();
  });
});
