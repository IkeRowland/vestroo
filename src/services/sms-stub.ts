/**
 * SMS provider hook (VST-6 stub / VST-9 extension point).
 * TODO: Wire Twilio, MessageBird, or agreed SA provider; read API keys from env.
 */

export type BookingSmsStubPayload = {
  bookingId: string;
  customerPhone: string;
};

/**
 * No-op placeholder — safe to call from Server Actions after booking create.
 */
export async function notifyBookingCreatedSmsStub(
  payload: BookingSmsStubPayload
): Promise<void> {
  void payload;
  // TODO(VST-9): send transactional SMS when provider + templates are configured.
}
