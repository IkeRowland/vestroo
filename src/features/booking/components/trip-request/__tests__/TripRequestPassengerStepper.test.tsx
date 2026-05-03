/** @vitest-environment happy-dom */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TripRequestPassengerStepper } from '../TripRequestPassengerStepper';

describe('TripRequestPassengerStepper', () => {
  it('exposes spinbutton aria-valuenow and disables decrease at minimum', () => {
    const onChange = vi.fn();
    render(
      <TripRequestPassengerStepper id="trip-passengers" value={1} onChange={onChange} />,
    );
    const spin = screen.getByRole('spinbutton');
    expect(spin.getAttribute('aria-valuenow')).toBe('1');
    const dec = screen.getByRole('button', { name: /decrease passengers/i });
    expect(dec.getAttribute('aria-disabled')).toBe('true');
  });

  it('requests increment and decrement via buttons', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TripRequestPassengerStepper id="trip-passengers" value={5} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /increase passengers/i }));
    expect(onChange).toHaveBeenLastCalledWith(6);
    rerender(
      <TripRequestPassengerStepper id="trip-passengers" value={6} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /decrease passengers/i }));
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('disables increase at 20 with aria-disabled', () => {
    render(
      <TripRequestPassengerStepper id="trip-passengers" value={20} onChange={() => {}} />,
    );
    const inc = screen.getByRole('button', { name: /increase passengers/i });
    expect(inc.getAttribute('aria-disabled')).toBe('true');
  });
});
