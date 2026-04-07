import { createHash } from 'crypto';
import { describe, it, expect } from 'vitest';
import { verifyPayFastWebhookSignature } from '@/lib/payfast';

function md5PayfastItn(data: Record<string, string>, passphrase: string): string {
  const paramString = Object.keys(data)
    .sort()
    .filter((key) => {
      if (key === 'signature') return false;
      const value = data[key];
      return value !== null && value !== undefined && value !== '';
    })
    .map((key) => `${key}=${encodeURIComponent(data[key])}`)
    .join('&');
  const signatureString = `${paramString}&passphrase=${encodeURIComponent(passphrase)}`;
  return createHash('md5').update(signatureString).digest('hex');
}

describe('verifyPayFastWebhookSignature', () => {
  const passphrase = 'unit-test-passphrase';

  it('returns true for a correctly signed ITN payload', () => {
    const base: Record<string, string> = {
      m_payment_id: 'b1111111-1111-4111-8111-111111111111',
      pf_payment_id: '123456',
      payment_status: 'COMPLETE',
      amount_gross: '199.00',
      email_address: 'a@example.com',
    };
    const sig = md5PayfastItn(base, passphrase);
    const payload = { ...base, signature: sig };
    expect(verifyPayFastWebhookSignature(payload, sig, passphrase)).toBe(true);
  });

  it('returns false when a field is tampered after signing', () => {
    const base: Record<string, string> = {
      m_payment_id: 'b1111111-1111-4111-8111-111111111111',
      payment_status: 'COMPLETE',
      amount_gross: '199.00',
    };
    const sig = md5PayfastItn(base, passphrase);
    const tampered = { ...base, amount_gross: '1.00', signature: sig };
    expect(verifyPayFastWebhookSignature(tampered, sig, passphrase)).toBe(false);
  });

  it('returns false for wrong passphrase', () => {
    const base: Record<string, string> = {
      m_payment_id: 'x',
      payment_status: 'COMPLETE',
    };
    const sig = md5PayfastItn(base, passphrase);
    expect(verifyPayFastWebhookSignature(base, sig, 'wrong-passphrase')).toBe(false);
  });
});
