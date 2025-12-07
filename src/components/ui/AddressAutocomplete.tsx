'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import type { PlaceResult } from '@/lib/maps';

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
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Store callbacks in refs to avoid recreating autocomplete on every render
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);

  // Update refs when callbacks change
  useEffect(() => {
    onSelectRef.current = onSelect;
    onChangeRef.current = onChange;
  }, [onSelect, onChange]);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    if (existingScript) {
      // Script exists, wait for it to load
      if (window.google?.maps?.places) {
        setIsLoaded(true);
      } else {
        // Wait for the existing script to load
        const checkInterval = setInterval(() => {
          if (window.google?.maps?.places) {
            setIsLoaded(true);
            clearInterval(checkInterval);
          }
        }, 100);

        // Cleanup interval after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.google?.maps?.places) {
            console.error('Google Maps API failed to load within timeout');
          }
        }, 10000);

        return () => clearInterval(checkInterval);
      }
      return;
    }

    // Get API key from environment (Next.js embeds NEXT_PUBLIC_ vars at build time)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set. Please add it to your .env file and restart the dev server.');
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for Google Maps API to be fully initialized
      // The script may load but the API might not be immediately available
      const checkPlaces = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkPlaces);
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkPlaces);
        if (window.google?.maps?.places) {
          setIsLoaded(true);
        } else {
          console.error('Google Maps Places API not available after script load');
        }
      }, 5000);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API. Check your API key and network connection.');
    };
    
    document.head.appendChild(script);

    // Cleanup function - don't remove script as it might be needed by other components
    return () => {
      // Just clear the loaded state if component unmounts
      setIsLoaded(false);
    };
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled) {
      return;
    }

    // Double-check that Places API is available (defensive check)
    if (!window.google?.maps?.places) {
      // If isLoaded is true but API isn't available, reset and wait
      setIsLoaded(false);
      return;
    }

    // Cleanup existing autocomplete
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
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
      setIsLoaded(false);
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
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-label={label}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `error-${finalInputId}` : undefined}
          className={`${error ? 'border-red-500' : 'border-gray-200'} h-12 text-xs font-medium bg-gray-100 hover:bg-gray-200 focus:bg-white focus:border-[#25A89B] focus:ring-1 focus:ring-[#25A89B] text-gray-600 placeholder:text-gray-500 transition-all rounded-lg pl-10 cursor-text`}
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
        placeholder={placeholder}
        required={required}
        disabled={disabled || !isLoaded}
        aria-label={label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${finalInputId}` : undefined}
        className={`${error ? 'border-red-500' : 'border-gray-200'} ${iconPadding ? 'pl-9' : 'pl-3'} h-12 text-xs font-bold focus:border-[#25A89B] focus:ring-[#25A89B] text-gray-900 bg-white placeholder:text-gray-400 transition-all shadow-sm rounded-lg`}
      />
      {error && (
        <p id={`error-${finalInputId}`} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

