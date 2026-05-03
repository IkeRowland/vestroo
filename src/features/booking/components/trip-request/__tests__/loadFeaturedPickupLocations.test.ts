import { describe, expect, it } from 'vitest';

import { loadFeaturedPickupLocations } from '../loadFeaturedPickupLocations';

describe('loadFeaturedPickupLocations', () => {
  it('returns static hubs with valid location payloads for chips', async () => {
    const rows = await loadFeaturedPickupLocations();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.id).toBeTruthy();
      expect(row.label.length).toBeGreaterThan(0);
      expect(row.location.placeId.length).toBeGreaterThan(0);
      expect(row.location.formattedAddress.length).toBeGreaterThan(0);
      expect(Number.isFinite(row.location.latitude)).toBe(true);
      expect(Number.isFinite(row.location.longitude)).toBe(true);
    }
  });
});
