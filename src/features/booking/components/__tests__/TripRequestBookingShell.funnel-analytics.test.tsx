/** @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountDomainCandidateRow } from '@/actions/client-type-resolution';
import {
  __setBookingFunnelAnalyticsSinkForTests,
  type BookingFunnelEventName,
} from '@/lib/booking-funnel-analytics';
import {
  defaultRideDetailsFormValues,
  type RideDetailsFormValues,
} from '@/features/booking/components/trip-request/ride-details-validate';

import { TripRequestBookingShell } from '../TripRequestBookingShell';

vi.mock('@/actions/submitTripRequest', () => ({
  submitTripRequest: vi.fn(() => Promise.resolve({ success: false as const, error: 'mock' })),
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
      ],
    }),
  ),
}));

vi.mock('@/features/booking/components/trip-request/load-trip-request-countries', () => ({
  loadTripRequestCountryOptions: vi.fn(() => Promise.resolve([])),
}));

const resolveAccountsByEmailDomain = vi.hoisted(() => vi.fn());

vi.mock('@/actions/resolveAccountsByEmailDomain', () => ({
  resolveAccountsByEmailDomain,
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

const corpRow = (over: Partial<AccountDomainCandidateRow> = {}): AccountDomainCandidateRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Example Corp',
  credit_terms_days: 30,
  default_billing_entity_ref: null,
  default_po_required: false,
  ...over,
});

describe('TripRequestBookingShell — FE.19.10 funnel analytics', () => {
  const events: { name: BookingFunnelEventName; properties: Record<string, unknown> }[] = [];

  beforeEach(() => {
    events.length = 0;
    resolveAccountsByEmailDomain.mockReset();
    resolveAccountsByEmailDomain.mockResolvedValue({
      success: true as const,
      domain: 'example.com',
      accounts: [corpRow()],
    });
    __setBookingFunnelAnalyticsSinkForTests((e) => {
      events.push({ name: e.name, properties: { ...e.properties } });
    });
  });

  afterEach(() => {
    __setBookingFunnelAnalyticsSinkForTests(null);
  });

  it('emits view, slide views, slide_complete on Next, and submit_error with category (no raw error)', async () => {
    const { submitTripRequest } = await import('@/actions/submitTripRequest');
    vi.mocked(submitTripRequest).mockResolvedValue({
      success: false as const,
      error: 'Please check your details and try again.',
    });

    render(<TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />);

    await waitFor(() => {
      expect(events.some((e) => e.name === 'booking_funnel_view')).toBe(true);
    });
    /** Embedded handoff skips in-shell trip slide — first view is vehicle (`slide_index` 2). */
    expect(events.some((e) => e.name === 'booking_funnel_slide_view' && e.properties.slide_index === 2)).toBe(true);

    await waitFor(() => screen.getByText(/Alpha Shuttle/));
    const vLabel = screen.getByText(/Alpha Shuttle/).closest('label') as HTMLElement;
    fireEvent.click(within(vLabel).getByRole('radio'));
    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => {
      expect(events.filter((e) => e.name === 'booking_funnel_slide_complete').length).toBeGreaterThanOrEqual(1);
    });
    expect(events.some((e) => e.name === 'booking_funnel_slide_complete' && e.properties.slide_index === 2)).toBe(
      true,
    );
    await waitFor(() => {
      expect(events.some((e) => e.name === 'booking_funnel_slide_view' && e.properties.slide_index === 3)).toBe(
        true,
      );
    });
    await waitFor(() => {
      expect(document.getElementById('trip-request-email')).toBeTruthy();
    });

    fireEvent.change(document.getElementById('trip-request-first-name') as HTMLInputElement, {
      target: { value: 'Pat' },
    });
    fireEvent.change(document.getElementById('trip-request-last-name') as HTMLInputElement, {
      target: { value: 'Lee' },
    });
    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });
    fireEvent.change(document.getElementById('trip-request-phone-national') as HTMLInputElement, {
      target: { value: '821234567' },
    });

    fireEvent.click(screen.getByTestId('trip-request-submit'));

    await waitFor(() => {
      expect(events.some((e) => e.name === 'booking_funnel_submit_error')).toBe(true);
    });
    const err = events.find((e) => e.name === 'booking_funnel_submit_error');
    expect(err?.properties.error_category).toBe('validation_client');
    expect(err?.properties).not.toHaveProperty('error');
    expect(err?.properties).not.toHaveProperty('message');

    for (const e of events) {
      const json = JSON.stringify(e.properties);
      expect(json).not.toMatch(/@example|Pat|Lee|821234567|1 Example St/i);
    }
  });

  it('emits submit_success with booking_reference and time_to_submit_ms', async () => {
    const { submitTripRequest } = await import('@/actions/submitTripRequest');
    vi.mocked(submitTripRequest).mockResolvedValue({
      success: true as const,
      bookingId: 'bid-1',
      bookingReference: 'VST-ABCDEF12',
    });

    render(<TripRequestBookingShell embedded embeddedRidePrefill={validEmbeddedPrefill()} />);

    await waitFor(() => expect(events.some((e) => e.name === 'booking_funnel_view')).toBe(true));

    await waitFor(() => screen.getByText(/Alpha Shuttle/));
    const vLabel = screen.getByText(/Alpha Shuttle/).closest('label') as HTMLElement;
    fireEvent.click(within(vLabel).getByRole('radio'));
    fireEvent.click(screen.getByTestId('trip-request-next'));

    await waitFor(() => expect(document.getElementById('trip-request-email')).toBeTruthy());

    fireEvent.change(document.getElementById('trip-request-first-name') as HTMLInputElement, {
      target: { value: 'Pat' },
    });
    fireEvent.change(document.getElementById('trip-request-last-name') as HTMLInputElement, {
      target: { value: 'Lee' },
    });
    fireEvent.change(document.getElementById('trip-request-email') as HTMLInputElement, {
      target: { value: 'booker@example.com' },
    });
    fireEvent.change(document.getElementById('trip-request-phone-national') as HTMLInputElement, {
      target: { value: '821234567' },
    });

    fireEvent.click(screen.getByTestId('trip-request-submit'));

    await waitFor(() => {
      expect(events.some((e) => e.name === 'booking_funnel_submit_success')).toBe(true);
    });
    const ok = events.find((e) => e.name === 'booking_funnel_submit_success');
    expect(ok?.properties.booking_reference).toBe('VST-ABCDEF12');
    expect(typeof ok?.properties.time_to_submit_ms).toBe('number');
    expect((ok?.properties.time_to_submit_ms as number) >= 0).toBe(true);
    await waitFor(() => {
      expect(events.some((e) => e.name === 'booking_funnel_slide_view' && e.properties.slide_index === 4)).toBe(
        true,
      );
    });
  });
});
