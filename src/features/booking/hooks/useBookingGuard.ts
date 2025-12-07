'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingStore } from './useBookingStore';
import { getGuard, type GuardType } from '@/lib/booking-guards';

/**
 * Hook for route protection in booking flow
 * Automatically redirects if required data is missing
 */
export function useBookingGuard(type: GuardType) {
  const router = useRouter();
  const store = useBookingStore();
  const [isValid, setIsValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const guard = getGuard(type);
    const result = guard(store);

    if (!result.isValid) {
      router.push(result.redirectPath);
      setIsValid(false);
    } else {
      setIsValid(true);
    }
    setIsChecking(false);
  }, [type, store, router]);

  return { isValid, isChecking };
}

