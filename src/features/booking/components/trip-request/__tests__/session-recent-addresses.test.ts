/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach } from 'vitest';

import {
  appendSessionRecentAddress,
  mergeRecentAddressEntries,
  readSessionRecentAddresses,
  SESSION_RECENT_ADDRESSES_MAX,
  SESSION_TRIP_REQUEST_RECENT_ADDRESSES_KEY,
  type SessionRecentAddressEntry,
} from '../session-recent-addresses';
import type { TripRequestLocation } from '../ride-details-validate';

const loc = (id: string): TripRequestLocation => ({
  placeId: id,
  formattedAddress: `Address ${id}`,
  name: `Name ${id}`,
  latitude: -26.1,
  longitude: 28.0,
});

describe('mergeRecentAddressEntries', () => {
  it('moves duplicate placeId to the front with the new entry', () => {
    const first: SessionRecentAddressEntry = {
      usedAt: '2026-01-01T00:00:00.000Z',
      location: loc('a'),
    };
    const second: SessionRecentAddressEntry = {
      usedAt: '2026-02-01T00:00:00.000Z',
      location: loc('a'),
    };
    const out = mergeRecentAddressEntries([first], second);
    expect(out).toHaveLength(1);
    expect(out[0].usedAt).toBe(second.usedAt);
  });

  it('keeps most recent first and caps at max', () => {
    let prev: SessionRecentAddressEntry[] = [];
    for (let i = 0; i < 12; i++) {
      const entry: SessionRecentAddressEntry = {
        usedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
        location: loc(`p${i}`),
      };
      prev = mergeRecentAddressEntries(prev, entry, SESSION_RECENT_ADDRESSES_MAX);
    }
    expect(prev).toHaveLength(SESSION_RECENT_ADDRESSES_MAX);
    expect(prev[0].location.placeId).toBe('p11');
  });
});

describe('sessionStorage integration', () => {
  function memoryStorage(): Storage {
    const store: Record<string, string> = {};
    return {
      get length() {
        return Object.keys(store).length;
      },
      clear(): void {
        for (const k of Object.keys(store)) delete store[k];
      },
      getItem(key: string): string | null {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      key(index: number): string | null {
        const keys = Object.keys(store);
        return keys[index] ?? null;
      },
      removeItem(key: string): void {
        delete store[key];
      },
      setItem(key: string, value: string): void {
        store[key] = value;
      },
    } as Storage;
  }

  beforeEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: memoryStorage(),
    });
  });

  it('appendSessionRecentAddress persists and readSessionRecentAddresses returns newest first', () => {
    appendSessionRecentAddress(loc('one'));
    appendSessionRecentAddress(loc('two'));
    const rows = readSessionRecentAddresses();
    expect(rows.map((r) => r.location.placeId)).toEqual(['two', 'one']);
    expect(window.sessionStorage.getItem(SESSION_TRIP_REQUEST_RECENT_ADDRESSES_KEY)).toBeDefined();
  });
});
