import type { TripRequestLocation } from './ride-details-validate';

/** Session-only; cleared when the tab closes (NFR.19.4). */
export const SESSION_TRIP_REQUEST_RECENT_ADDRESSES_KEY =
  'vestroo:trip-request:recent-addresses:v1';

export const SESSION_RECENT_ADDRESSES_MAX = 8;

export type SessionRecentAddressEntry = {
  /** ISO time for ordering */
  usedAt: string;
  location: TripRequestLocation;
};

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function parseEntries(raw: string | null): SessionRecentAddressEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (row): row is SessionRecentAddressEntry =>
        row != null &&
        typeof row === 'object' &&
        typeof (row as SessionRecentAddressEntry).usedAt === 'string' &&
        typeof (row as SessionRecentAddressEntry).location === 'object' &&
        (row as SessionRecentAddressEntry).location != null &&
        typeof (row as SessionRecentAddressEntry).location.placeId === 'string',
    );
  } catch {
    return [];
  }
}

/** Read-only list, newest first (by `usedAt`). */
export function readSessionRecentAddresses(): SessionRecentAddressEntry[] {
  if (!canUseSessionStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_TRIP_REQUEST_RECENT_ADDRESSES_KEY);
    return parseEntries(raw);
  } catch {
    return [];
  }
}

/**
 * Dedupe by `placeId` (keep newest), cap length, persist.
 * Exported for unit tests.
 */
export function mergeRecentAddressEntries(
  prev: SessionRecentAddressEntry[],
  next: SessionRecentAddressEntry,
  max: number = SESSION_RECENT_ADDRESSES_MAX,
): SessionRecentAddressEntry[] {
  const filtered = prev.filter((e) => e.location.placeId !== next.location.placeId);
  const merged = [{ ...next, usedAt: next.usedAt }, ...filtered];
  return merged.slice(0, max);
}

/** Record a successfully resolved pickup or drop-off after Places selection. */
export function appendSessionRecentAddress(location: TripRequestLocation): void {
  if (!canUseSessionStorage()) return;
  try {
    const prev = readSessionRecentAddresses();
    const entry: SessionRecentAddressEntry = {
      usedAt: new Date().toISOString(),
      location,
    };
    const merged = mergeRecentAddressEntries(prev, entry);
    window.sessionStorage.setItem(
      SESSION_TRIP_REQUEST_RECENT_ADDRESSES_KEY,
      JSON.stringify(merged),
    );
  } catch {
    /* quota / private mode */
  }
}
