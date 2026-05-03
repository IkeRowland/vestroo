/** @vitest-environment happy-dom */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TripRequestFunnelProgress } from './TripRequestFunnelProgress';

describe('TripRequestFunnelProgress', () => {
  it('sets aria-current="step" only on the active step', () => {
    const { rerender } = render(<TripRequestFunnelProgress currentIndex={0} />);
    const nav = screen.getByRole('navigation', { name: 'Trip request progress' });
    const items = within(nav).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0].getAttribute('aria-current')).toBe('step');
    expect(items[1].getAttribute('aria-current')).toBeNull();
    expect(items[2].getAttribute('aria-current')).toBeNull();
    expect(items[3].getAttribute('aria-current')).toBeNull();

    rerender(<TripRequestFunnelProgress currentIndex={3} />);
    const itemsAfter = within(screen.getByRole('navigation', { name: 'Trip request progress' })).getAllByRole(
      'listitem',
    );
    expect(itemsAfter[0].getAttribute('aria-current')).toBeNull();
    expect(itemsAfter[3].getAttribute('aria-current')).toBe('step');
  });
});
