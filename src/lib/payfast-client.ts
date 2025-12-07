'use client';

import { PayFastPaymentParams } from './payfast';

/**
 * Initialize PayFast payment
 * PayFast uses a form submission approach that redirects to PayFast payment page
 * After payment, PayFast redirects back to return_url
 * Reference: https://developers.payfast.co.za/documentation/#onsite-payments
 */
export function initializePayFastModal(payfastData: PayFastPaymentParams): Promise<void> {
  return new Promise((resolve) => {
    // Get PayFast URL from environment or use default
    const payfastUrl = process.env.NEXT_PUBLIC_PAYFAST_URL || 'https://sandbox.payfast.co.za';

    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${payfastUrl}/eng/process`;

    // Add all payment parameters as hidden inputs
    Object.entries(payfastData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    // Append form to body and submit
    document.body.appendChild(form);
    form.submit();

    // Resolve immediately - actual success/failure handled via return_url redirect
    // The return_url in payfastData will redirect user back to confirmation page
    resolve();
  });
}

