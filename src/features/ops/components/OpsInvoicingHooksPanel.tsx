'use client';

import { useState } from 'react';
import { updateBookingInvoicingHooksAction } from '@/actions/opsInvoicingHooks';
import { Button } from '@/components/ui/button';

export function OpsInvoicingHooksPanel() {
  const [bookingId, setBookingId] = useState('');
  const [invoiceRequested, setInvoiceRequested] = useState(false);
  const [purchaseOrderRef, setPurchaseOrderRef] = useState('');
  const [billingEntityRef, setBillingEntityRef] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const res = await updateBookingInvoicingHooksAction({
        bookingId: bookingId.trim(),
        invoiceRequested,
        purchaseOrderRef: purchaseOrderRef.trim() || null,
        billingEntityRef: billingEntityRef.trim() || null,
      });
      setMessage(
        res.success ? 'Saved.' : res.error ?? 'Something went wrong.'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-xl rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h1 className="text-lg font-semibold text-white">Corporate invoicing hooks</h1>
      <p className="mt-1 text-sm text-zinc-400">
        MVP staff tool: set invoice request flag and short references on a booking (no PDF).
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm text-zinc-300">
          Booking ID (UUID)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            value={bookingId}
            onChange={(ev) => setBookingId(ev.target.value)}
            placeholder="00000000-0000-4000-8000-000000000000"
            required
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={invoiceRequested}
            onChange={(ev) => setInvoiceRequested(ev.target.checked)}
          />
          Invoice requested
        </label>
        <label className="block text-sm text-zinc-300">
          Purchase order ref (optional)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            value={purchaseOrderRef}
            onChange={(ev) => setPurchaseOrderRef(ev.target.value)}
            maxLength={120}
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Billing entity ref (optional)
          <input
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            value={billingEntityRef}
            onChange={(ev) => setBillingEntityRef(ev.target.value)}
            maxLength={120}
          />
        </label>
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {message && (
          <p className="text-sm text-zinc-300" role="status">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
