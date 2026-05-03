import { afterEach, describe, expect, it, vi } from 'vitest';

import { accountRequiresPurchaseOrderMessage } from '@/lib/account-po-policy';
import {
  __setBookingFunnelAnalyticsSinkForTests,
  assertBookingFunnelPayloadHasNoForbiddenKeys,
  bookingFunnelSubmitErrorCategoryFromMessage,
  trackBookingFunnelSubmitError,
  trackBookingFunnelSubmitSuccess,
  trackBookingFunnelView,
} from '@/lib/booking-funnel-analytics';

describe('bookingFunnelSubmitErrorCategoryFromMessage', () => {
  it('maps known submitTripRequest client messages', () => {
    expect(bookingFunnelSubmitErrorCategoryFromMessage('Please check your details and try again.')).toBe(
      'validation_client',
    );
    expect(
      bookingFunnelSubmitErrorCategoryFromMessage(
        'Please enter a valid phone number for the selected country.',
      ),
    ).toBe('validation_client');
  });

  it('maps PO policy message without echoing raw text to analytics payloads', () => {
    const msg = accountRequiresPurchaseOrderMessage('Acme Ltd');
    expect(bookingFunnelSubmitErrorCategoryFromMessage(msg)).toBe('purchase_order');
  });

  it('maps insert and billing verification failures', () => {
    expect(
      bookingFunnelSubmitErrorCategoryFromMessage(
        'Could not verify organisation billing rules. Please try again.',
      ),
    ).toBe('validation_server');
    expect(
      bookingFunnelSubmitErrorCategoryFromMessage('We could not save your request. Please try again shortly.'),
    ).toBe('validation_server');
  });

  it('maps generic catch-all and network-ish hints', () => {
    expect(bookingFunnelSubmitErrorCategoryFromMessage('Something went wrong. Please try again.')).toBe('unknown');
    expect(bookingFunnelSubmitErrorCategoryFromMessage('fetch failed: network')).toBe('network');
  });

  it('uses unknown for arbitrary enrich errors (may contain PII)', () => {
    expect(bookingFunnelSubmitErrorCategoryFromMessage('No organisation matches this email domain.')).toBe('unknown');
  });
});

describe('assertBookingFunnelPayloadHasNoForbiddenKeys', () => {
  it('allows known safe analytics keys', () => {
    expect(() =>
      assertBookingFunnelPayloadHasNoForbiddenKeys({
        variant: 'v_test',
        slide_index: 2,
        embedded: true,
        booking_reference: 'VST-12345678',
        time_to_submit_ms: 42,
        error_category: 'validation_client',
      }),
    ).not.toThrow();
  });

  it('rejects keys that look like PII carriers in non-production', () => {
    if (process.env.NODE_ENV === 'production') return;
    expect(() => assertBookingFunnelPayloadHasNoForbiddenKeys({ user_email: 'x' })).toThrow(/forbidden key/);
    expect(() => assertBookingFunnelPayloadHasNoForbiddenKeys({ pickup_hint: 'x' })).toThrow(/forbidden key/);
  });
});

describe('trackBookingFunnelView + test sink', () => {
  afterEach(() => {
    __setBookingFunnelAnalyticsSinkForTests(null);
  });

  it('forwards sanitized payloads to the test sink without forbidden keys', () => {
    const sink = vi.fn();
    __setBookingFunnelAnalyticsSinkForTests(sink);
    trackBookingFunnelView({ variant: 'v_unit', embedded: true });
    expect(sink).toHaveBeenCalledTimes(1);
    const arg = sink.mock.calls[0][0];
    expect(arg.name).toBe('booking_funnel_view');
    expect(arg.properties).toEqual({ variant: 'v_unit', embedded: true });
    const keys = Object.keys(arg.properties as object).join(' ');
    expect(keys).not.toMatch(/email|phone|address|pickup|destination/i);
  });

  it('submit success payload carries booking_reference and timing only', () => {
    const sink = vi.fn();
    __setBookingFunnelAnalyticsSinkForTests(sink);
    trackBookingFunnelSubmitSuccess({
      variant: 'v_unit',
      booking_reference: 'VST-00009999',
      time_to_submit_ms: 1200,
    });
    expect(sink.mock.calls[0][0].name).toBe('booking_funnel_submit_success');
    expect(sink.mock.calls[0][0].properties).toEqual({
      variant: 'v_unit',
      booking_reference: 'VST-00009999',
      time_to_submit_ms: 1200,
    });
  });

  it('submit error payload carries category only', () => {
    const sink = vi.fn();
    __setBookingFunnelAnalyticsSinkForTests(sink);
    trackBookingFunnelSubmitError({ variant: 'v_unit', error_category: 'unknown' });
    expect(sink.mock.calls[0][0].properties).toEqual({ variant: 'v_unit', error_category: 'unknown' });
    expect(JSON.stringify(sink.mock.calls[0][0].properties)).not.toContain('Please');
  });
});
