import { describe, it, expect } from 'vitest';
import { isValidTicketInventoryTransition } from '@/lib/ticket-inventory-transitions';

describe('isValidTicketInventoryTransition', () => {
  it('allows hold to confirmed, released, expired, cancelled', () => {
    expect(isValidTicketInventoryTransition('hold', 'confirmed')).toBe(true);
    expect(isValidTicketInventoryTransition('hold', 'released')).toBe(true);
    expect(isValidTicketInventoryTransition('hold', 'expired')).toBe(true);
    expect(isValidTicketInventoryTransition('hold', 'cancelled')).toBe(true);
  });

  it('rejects terminal states from changing', () => {
    expect(isValidTicketInventoryTransition('released', 'hold')).toBe(false);
    expect(isValidTicketInventoryTransition('expired', 'confirmed')).toBe(false);
  });

  it('allows confirmed to cancelled only', () => {
    expect(isValidTicketInventoryTransition('confirmed', 'cancelled')).toBe(true);
    expect(isValidTicketInventoryTransition('confirmed', 'hold')).toBe(false);
  });

  it('allows legacy to any target', () => {
    expect(isValidTicketInventoryTransition('legacy', 'hold')).toBe(true);
  });
});
