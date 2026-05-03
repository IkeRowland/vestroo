/** @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  defaultRideDetailsFormValues,
  type RideDetailsFormValues,
} from '@/features/booking/components/trip-request/ride-details-validate';

import { TripRequestBookingShell } from '../TripRequestBookingShell';

vi.mock('@/actions/submitTripRequest', () => ({
  submitTripRequest: vi.fn(() => Promise.resolve({ success: false as const, error: 'mock' })),
}));

vi.mock('@/features/booking/components/BookingAccountDomainGate', () => ({
  BookingAccountDomainGate: () => null,
}));

vi.mock('@/actions/getTripRequestVehicleOffers', () => ({
  getTripRequestVehicleOffers: vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      vehicles: [
        {
          id: 'veh-a',
          name: 'Alpha Shuttle',
          classification: 'MPV class',
          passengerCapacity: 8,
          luggageCapacityLabel: '6 bags',
        },
        {
          id: 'veh-b',
          name: 'Beta Sedan',
          classification: 'Sedan class',
          passengerCapacity: 4,
          luggageCapacityLabel: '2 bags',
        },
      ],
    }),
  ),
}));

vi.mock('@/features/booking/components/trip-request/load-trip-request-countries', () => ({
  /** Lazy-loaded on slide 3 when the phone country popover opens (FE.19.7); kept for dynamic panel imports. */
  loadTripRequestCountryOptions: vi.fn(() => Promise.resolve([])),
}));

const baseLoc = {
  placeId: 'ChIJx',
  formattedAddress: '1 Example St',
  name: 'Example',
  latitude: -26.0,
  longitude: 28.0,
};

function validEmbeddedPrefill(): RideDetailsFormValues {
  return {
    ...defaultRideDetailsFormValues(),
    pickup: { ...baseLoc, types: ['establishment'] },
    destination: { ...baseLoc, placeId: 'ChIJy' },
    pickupInput: baseLoc.formattedAddress,
    destinationInput: baseLoc.formattedAddress,
    rideDate: '2099-06-20',
    rideTime: '12:00',
    passengers: 2,
  };
}

describe('TripRequestBookingShell — vehicle gate (FE.19.6)', () => {
  it('shows required vehicle intro copy on the vehicle slide', async () => {
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /choose your vehicle/i })).toBeTruthy();
    });

    expect(
      screen.getByText(/selection is required before passenger details/i),
    ).toBeTruthy();
    expect(screen.getByText(/pick one vehicle class below/i)).toBeTruthy();
  });

  it('does not show monetary quote pressure on the vehicle slide', async () => {
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(screen.getByText(/Alpha Shuttle/)).toBeTruthy();
    });

    expect(screen.queryByText(/from r/i)).toBeNull();
    expect(screen.queryByText(/zar/i)).toBeNull();
  });

  it('keeps Next disabled until a vehicle is selected; then reaches passenger slide', async () => {
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(screen.getByText(/Alpha Shuttle/)).toBeTruthy();
    });

    const next = screen.getByTestId('trip-request-next') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(screen.queryByRole('heading', { name: /^passenger details$/i })).toBeNull();

    const alphaCard = screen.getByText('Alpha Shuttle').closest('label');
    expect(alphaCard).toBeTruthy();
    fireEvent.click(within(alphaCard as HTMLElement).getByRole('radio'));

    await waitFor(() => {
      expect((screen.getByTestId('trip-request-next') as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^passenger details$/i })).toBeTruthy();
    });
  });

  it('moves selection when another vehicle card is chosen (last choice wins)', async () => {
    render(
      <TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />,
    );

    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(screen.getByText(/Alpha Shuttle/)).toBeTruthy();
    });

    const alphaCard = screen.getByText('Alpha Shuttle').closest('label') as HTMLElement;
    const betaCard = screen.getByText('Beta Sedan').closest('label') as HTMLElement;

    fireEvent.click(within(alphaCard).getByRole('radio'));
    fireEvent.click(within(betaCard).getByRole('radio'));

    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(screen.getByText(/Beta Sedan/)).toBeTruthy();
    });
  });
});
