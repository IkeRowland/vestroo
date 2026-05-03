'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { loadGoogleMapsPlacesClient, type PlaceResult } from '@/lib/maps';

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  iconPadding?: boolean;
  buttonStyle?: boolean;
  inputId?: string;
  icon?: 'pickup' | 'dropoff';
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

/**
 * AddressAutocomplete component with Google Maps Places Autocomplete
 * Provides location suggestions as the user types
 */
export function AddressAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  placeholder = 'Enter address...',
  required = false,
  error,
  disabled = false,
  iconPadding = false,
  buttonStyle = false,
  inputId,
  icon = 'pickup',
  onInputFocus,
  onInputBlur,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState<string | null>(null);
  // Store callbacks in refs to avoid recreating autocomplete on every render
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);

  // Update refs when callbacks change
  useEffect(() => {
    onSelectRef.current = onSelect;
    onChangeRef.current = onChange;
  }, [onSelect, onChange]);

  // Load Google Maps + Places via shared single-flight loader (`callback` URL param; no `loading=async`).
  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsPlacesClient()
      .then(() => {
        if (!cancelled) {
          setMapsLoadError(null);
          setIsLoaded(true);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[AddressAutocomplete]', msg);
        if (!cancelled) {
          setMapsLoadError(msg);
          setIsLoaded(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Bind after paint so the input ref is attached; Google allows at most one `types` value — omit for all kinds.
  useLayoutEffect(() => {
    if (!isLoaded || !inputRef.current || disabled) {
      return;
    }

    if (!window.google?.maps?.places) {
      return;
    }

    // Cleanup existing autocomplete
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ['place_id', 'formatted_address', 'name', 'geometry', 'types'],
      });

      const handlePlaceChanged = () => {
        const place = autocomplete.getPlace();
        
        // Validate place has required data
        if (place.geometry && place.place_id && place.formatted_address) {
          try {
            // Use refs to get latest callbacks without recreating autocomplete
            onSelectRef.current(place as PlaceResult);
            onChangeRef.current(place.formatted_address);
          } catch (error) {
            console.error('Error handling place selection:', error);
          }
        }
      };

      autocomplete.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Error creating autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, disabled]); // Removed onSelect and onChange from dependencies since we use refs

  const finalInputId = inputId || `address-${label.toLowerCase().replace(/\s+/g, '-')}`;

  if (buttonStyle) {
    return (
      <div className="w-full relative">
        <Input
          ref={inputRef}
          id={finalInputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-label={label}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `error-${finalInputId}` : undefined}
          className={`${error ? 'border-destructive' : 'border-gray-200'} h-12 text-xs font-medium bg-gray-100 hover:bg-gray-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary text-gray-600 placeholder:text-gray-500 transition-all rounded-lg pl-10 cursor-text`}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-sm">
            {icon === 'pickup' ? (
              <svg className="h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
        </div>
        {mapsLoadError && (
          <p className="text-xs text-amber-700 mt-1" role="status">
            Address suggestions unavailable — you can still type an address.
          </p>
        )}
        {error && (
          <p id={`error-${finalInputId}`} className="text-xs text-red-500 mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {label && (
        <Label htmlFor={finalInputId} required={required} className="text-sm font-medium text-gray-700">
          {label}
        </Label>
      )}
      <Input
        ref={inputRef}
        id={finalInputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled || !isLoaded}
        aria-label={label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${finalInputId}` : undefined}
        className={`${error ? 'border-destructive' : 'border-gray-200'} ${iconPadding ? 'pl-9' : 'pl-3'} h-12 text-xs font-bold focus:border-primary focus:ring-primary text-gray-900 bg-white placeholder:text-gray-400 transition-all shadow-sm rounded-lg`}
      />
      {mapsLoadError && (
        <p className="text-sm text-amber-700" role="status">
          Address suggestions unavailable — you can still type an address. Ensure{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> and the
          Maps Places API are enabled.
        </p>
      )}
      {error && (
        <p id={`error-${finalInputId}`} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

