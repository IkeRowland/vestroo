'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import type { TripRequestCountryOption } from '@/features/booking/components/trip-request/load-trip-request-countries';
import { loadTripRequestCountryOptions } from '@/features/booking/components/trip-request/load-trip-request-countries';

export type TripRequestCountryPickerPanelProps = {
  idPrefix: string;
  valueIso2: string | null;
  /** Parent cache — `null` until first successful load (FE.19.7 lazy open). */
  cachedOptions: TripRequestCountryOption[] | null;
  onCachedOptions: (opts: TripRequestCountryOption[]) => void;
  onPick: (option: TripRequestCountryOption) => void;
};

/**
 * Searchable country list — loaded on mount when `cachedOptions` is empty.
 * Shipped behind `next/dynamic` from {@link TripRequestPassengerSlide} so the
 * `country-telephone-data` chunk downloads only after the user opens the popover.
 */
export default function TripRequestCountryPickerPanel({
  idPrefix,
  valueIso2,
  cachedOptions,
  onCachedOptions,
  onPick,
}: TripRequestCountryPickerPanelProps) {
  const listId = `${idPrefix}-listbox`;
  const filterId = `${idPrefix}-filter`;
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(() => !cachedOptions?.length);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (cachedOptions && cachedOptions.length > 0) {
      setLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void loadTripRequestCountryOptions()
      .then((opts) => {
        if (cancelled) return;
        onCachedOptions(opts);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Could not load countries. Check your connection and try again.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cachedOptions, onCachedOptions]);

  React.useEffect(() => {
    if (!loading) {
      const id = window.requestAnimationFrame(() => searchRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [loading]);

  const filtered = React.useMemo(() => {
    const opts = cachedOptions;
    if (!opts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return opts;
    return opts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso2.includes(q) ||
        c.dialPrefix.toLowerCase().includes(q),
    );
  }, [cachedOptions, query]);

  if (loadError) {
    return (
      <div className="p-3 text-sm text-destructive font-Poppins" role="alert" aria-live="assertive">
        {loadError}
      </div>
    );
  }

  if (loading || !cachedOptions) {
    return (
      <div className="p-4 text-sm text-slate-600" role="status" aria-live="polite">
        Loading countries…
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border p-2">
        <input
          ref={searchRef}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded="true"
          id={filterId}
          aria-label="Filter countries by name, ISO code, or dial prefix"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
            }
            if (e.key === 'Enter' && filtered[0]) {
              e.preventDefault();
              onPick(filtered[0]);
              setQuery('');
            }
          }}
          className="w-full rounded border border-border bg-background px-2 py-2 text-sm font-Poppins focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Countries"
        className="max-h-56 overflow-y-auto py-1"
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
        ) : (
          filtered.map((c) => (
            <li key={c.iso2} role="none">
              <button
                type="button"
                role="option"
                aria-selected={c.iso2 === valueIso2}
                className={cn(
                  'flex w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/60 focus:bg-muted/60 focus:outline-none',
                  c.iso2 === valueIso2 && 'bg-primary/10',
                )}
                onClick={() => {
                  onPick(c);
                  setQuery('');
                }}
              >
                <span className="flex-1 truncate">{c.name}</span>
                <span className="ml-2 shrink-0 text-slate-600">{c.dialPrefix}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
