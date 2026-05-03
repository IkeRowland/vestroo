import type { TicketInventoryStateDb } from '@/types/database.types';

/**
 * Mirrors `public.tickets_inventory_transition_guard` (SH.9.3) for tests and UI validation.
 * `legacy` rows may move to any state (migration / backfill).
 */
export function isValidTicketInventoryTransition(
  fromState: TicketInventoryStateDb,
  toState: TicketInventoryStateDb,
): boolean {
  if (fromState === toState) {
    return true;
  }
  if (fromState === 'legacy') {
    return true;
  }
  if (fromState === 'released' || fromState === 'expired' || fromState === 'cancelled') {
    return false;
  }
  if (fromState === 'hold') {
    return (
      toState === 'confirmed' ||
      toState === 'released' ||
      toState === 'expired' ||
      toState === 'cancelled'
    );
  }
  if (fromState === 'confirmed') {
    return toState === 'cancelled';
  }
  return false;
}
