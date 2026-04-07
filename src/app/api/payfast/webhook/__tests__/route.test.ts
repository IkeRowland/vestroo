import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendBookingConfirmation: vi
    .fn()
    .mockResolvedValue({ success: true, messageId: 'm1' }),
  createSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/payfast', () => ({
  verifyPayFastWebhookSignature: vi.fn(() => true),
}));

vi.mock('@/services/email', () => ({
  sendBookingConfirmation: mocks.sendBookingConfirmation,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => mocks.createSupabaseClient()),
}));

import { POST } from '../route';

const bookingId = 'b1111111-1111-4111-8111-111111111111';

function postRequest(body: URLSearchParams) {
  return new Request('http://localhost/api/payfast/webhook', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

describe('POST /api/payfast/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYFAST_PASSPHRASE = 'test';
  });

  it('returns 200 without emailing when booking is already paid (duplicate ITN)', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: bookingId, payment_status: 'paid', trans_id: 'pf-0' },
      error: null,
    });
    const update = vi.fn();
    mocks.createSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single,
        update,
      })),
    });

    const body = new URLSearchParams({
      m_payment_id: bookingId,
      pf_payment_id: 'pf-1',
      payment_status: 'COMPLETE',
      signature: 'sig',
    });

    const res = await POST(postRequest(body) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { message?: string };
    expect(json.message).toBe('Already processed');
    expect(update).not.toHaveBeenCalled();
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled();
  });

  it('transitions pending → paid, sends one confirmation email, returns 200', async () => {
    const transitioned = {
      id: bookingId,
      customer_name: 'A',
      customer_email: 'a@example.com',
      origin_name: 'O',
      destination_name: 'D',
      trip_date: new Date().toISOString(),
      passenger_count: 1,
      flight_number: null,
      total_amount: 100,
      payment_reference: 'VST-1',
      trans_id: 'pf-99',
      payment_status: 'paid',
    };
    const maybeSingle = vi.fn().mockResolvedValue({
      data: transitioned,
      error: null,
    });
    const single = vi.fn().mockResolvedValue({
      data: { id: bookingId, payment_status: 'pending', trans_id: null },
      error: null,
    });
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({ maybeSingle }),
    };
    mocks.createSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single,
        update: vi.fn().mockReturnValue(updateChain),
      })),
    });

    const body = new URLSearchParams({
      m_payment_id: bookingId,
      pf_payment_id: 'pf-99',
      payment_status: 'COMPLETE',
      signature: 'sig',
    });

    const res = await POST(postRequest(body) as never);
    expect(res.status).toBe(200);
    expect(mocks.sendBookingConfirmation).toHaveBeenCalledTimes(1);
  });
});
