/** @vitest-environment happy-dom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TripOfferVehicle } from '../trip-offer-vehicle';
import { TripRequestVehicleSlide } from '../TripRequestVehicleSlide';

const sampleVehicle = (cap: number): TripOfferVehicle => ({
  id: 'veh-1',
  name: 'Executive sedan',
  classification: 'Sedan class',
  passengerCapacity: cap,
  luggageCapacityLabel: '2 large bags',
});

describe('TripRequestVehicleSlide — capacity hint (FE.19.5)', () => {
  it('shows soft capacity note and dims when party exceeds vehicle capacity', () => {
    const v = sampleVehicle(4);
    render(
      <TripRequestVehicleSlide
        vehicles={[v]}
        selectedId={null}
        partyPassengers={8}
        onSelect={() => {}}
        loading={false}
        error={null}
        onRetry={() => {}}
        selectionError={null}
      />,
    );
    expect(screen.getByText(/pick a larger class/i)).toBeTruthy();
    expect(screen.getByText(/Capacity: 4/)).toBeTruthy();
  });

  it('does not show capacity warning when party fits', () => {
    const v = sampleVehicle(8);
    render(
      <TripRequestVehicleSlide
        vehicles={[v]}
        selectedId={null}
        partyPassengers={4}
        onSelect={() => {}}
        loading={false}
        error={null}
        onRetry={() => {}}
        selectionError={null}
      />,
    );
    expect(screen.queryByText(/pick a larger class/i)).toBeNull();
  });
});

describe('TripRequestVehicleSlide — required framing & card facts (FE.19.6)', () => {
  it('exposes a legend that states vehicle selection is required', () => {
    const v = sampleVehicle(8);
    const { container } = render(
      <TripRequestVehicleSlide
        vehicles={[v]}
        selectedId={null}
        partyPassengers={2}
        onSelect={() => {}}
        loading={false}
        error={null}
        onRetry={() => {}}
        selectionError={null}
      />,
    );
    const legend = container.querySelector('fieldset legend');
    expect(legend?.textContent?.toLowerCase()).toContain('required');
  });

  it('shows class, capacity, and bags lines without price wording', () => {
    const v = sampleVehicle(6);
    render(
      <TripRequestVehicleSlide
        vehicles={[v]}
        selectedId={null}
        partyPassengers={2}
        onSelect={() => {}}
        loading={false}
        error={null}
        onRetry={() => {}}
        selectionError={null}
      />,
    );
    expect(screen.getByText(/Sedan class/i)).toBeTruthy();
    expect(screen.getByText(/Up to 6 passengers/)).toBeTruthy();
    expect(screen.getByText(/^Bags:/)).toBeTruthy();
    expect(screen.getByText(/2 large bags/)).toBeTruthy();
    expect(screen.queryByText(/from r/i)).toBeNull();
  });
});
