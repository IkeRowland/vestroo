'use server';

import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { corporateInvoicingFieldsSchema } from '@/actions/booking-schemas';
import { getOpsStaffForAction } from '@/lib/ops-auth';

const updateBookingInvoicingSchema = z
  .object({
    bookingId: z.string().uuid(),
  })
  .merge(corporateInvoicingFieldsSchema);

/**
 * Staff-only MVP: adjust corporate invoicing flags on a booking (no PDF invoice).
 * See docs/integrations-and-payments.md.
 */
export async function updateBookingInvoicingHooksAction(input: unknown) {
  const gate = await getOpsStaffForAction();
  if (!gate.ok) {
    return { success: false as const, error: gate.message };
  }

  const parsed = updateBookingInvoicingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Invalid input' };
  }

  const { bookingId, invoiceRequested, purchaseOrderRef, billingEntityRef } =
    parsed.data;

  const patch: Record<string, unknown> = {};
  if (invoiceRequested !== undefined) {
    patch.invoice_requested = invoiceRequested;
  }
  if (purchaseOrderRef !== undefined) {
    patch.purchase_order_ref = purchaseOrderRef?.trim() || null;
  }
  if (billingEntityRef !== undefined) {
    patch.billing_entity_ref = billingEntityRef?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return { success: false as const, error: 'No fields to update' };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);

  if (error) {
    console.error('updateBookingInvoicingHooksAction', error);
    return { success: false as const, error: 'Update failed' };
  }

  return { success: true as const };
}
