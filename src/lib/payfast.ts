import * as crypto from 'crypto';

/**
 * PayFast payment parameters interface
 */
export interface PayFastPaymentParams {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  cell_number: string;
  m_payment_id: string; // Booking ID
  amount: string;
  item_name: string;
  signature: string;
}

/**
 * Generate PayFast payment signature
 * Reference: https://developers.payfast.co.za/documentation/#onsite-payments
 */
export function generatePayFastSignature(
  params: Omit<PayFastPaymentParams, 'signature'>,
  passphrase: string
): string {
  // Create parameter string (alphabetically sorted, excluding empty values and signature)
  const paramString = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .filter(([, value]) => {
      return value !== null && value !== undefined && value !== '';
    })
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  // Append passphrase
  const signatureString = `${paramString}&passphrase=${encodeURIComponent(passphrase)}`;

  // Generate MD5 hash
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Verify PayFast webhook signature
 */
export function verifyPayFastWebhookSignature(
  data: Record<string, string>,
  signature: string,
  passphrase: string
): boolean {
  // Create parameter string (alphabetically sorted, excluding signature and empty values)
  const paramString = Object.keys(data)
    .sort()
    .filter((key) => {
      const value = data[key];
      return (
        key !== 'signature' &&
        value !== null &&
        value !== undefined &&
        value !== ''
      );
    })
    .map((key) => `${key}=${encodeURIComponent(data[key])}`)
    .join('&');

  // Append passphrase
  const signatureString = `${paramString}&passphrase=${encodeURIComponent(passphrase)}`;

  // Generate MD5 hash
  const calculatedSignature = crypto.createHash('md5').update(signatureString).digest('hex');

  return calculatedSignature.toLowerCase() === signature.toLowerCase();
}

/**
 * Base URL for PayFast (sandbox or production). Server-only; used when building checkout redirects.
 */
export function getPayFastUrl(): string {
  return resolvePayFastProcessBaseUrl();
}

/**
 * PayFast site root for `POST …/eng/process` (no trailing slash).
 * Defaults to sandbox when unset so local dev works with only passphrase/key set.
 */
export function resolvePayFastProcessBaseUrl(): string {
  const payfastUrl = process.env.PAYFAST_URL?.trim();
  if (payfastUrl) {
    return payfastUrl.replace(/\/$/, '');
  }
  return 'https://sandbox.payfast.co.za';
}

