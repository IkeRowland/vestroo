'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { accountRequiresPurchaseOrderMessage } from '@/lib/account-po-policy';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useBookingStore } from '../hooks/useBookingStore';
import {
	BookingAccountDomainGate,
	type BookingAccountDomainGateHandle,
} from '@/features/booking/components/BookingAccountDomainGate';

// Zod schema for contact details validation
const contactDetailsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^(\+27|0)[0-9]{9}$/, 'Invalid South African phone number'),
  flightNumber: z.string().optional(),
  /** Epic 15 / 15B.1 — optional rider; empty → null at insert */
  riderName: z.string().max(200),
  riderEmail: z.string(),
  riderPhone: z.string(),
});

export type ContactDetailsFormData = z.infer<typeof contactDetailsSchema> & {
  purchaseOrderRef?: string;
};

interface ContactDetailsFormProps {
  onSubmit: (data: ContactDetailsFormData) => void;
  showFlightNumber?: boolean;
  /** Disables fields while an async submit (e.g. quote) is in flight. */
  disabled?: boolean;
  /** Optional id for programmatic submit from a parent footer button. */
  formId?: string;
  /** Story 12.5 — Q6 domain match prompt + store sync (default: on). */
  enableAccountDomainPrompt?: boolean;
}

export function ContactDetailsForm({
  onSubmit,
  showFlightNumber = false,
  disabled = false,
  formId,
  enableAccountDomainPrompt = true,
}: ContactDetailsFormProps) {
  const {
    customer,
    riderContact,
    purchaseOrderRef: savedPurchaseOrderRef,
    accountInvoicingContext,
    clientTypeResolution,
  } = useBookingStore();
  const portalRebookLocksDomainGate =
    clientTypeResolution?.clientTypeSource === 'portal_active_account_session';
  const accountGateRef = React.useRef<BookingAccountDomainGateHandle>(null);

  const contactSchemaWithPo = React.useMemo(() => {
    return contactDetailsSchema
      .extend({
        purchaseOrderRef: z.string().max(120).optional().or(z.literal('')),
      })
      .superRefine((data, ctx) => {
        if (accountInvoicingContext?.defaultPoRequired) {
          const t = (data.purchaseOrderRef ?? '').trim();
          if (!t) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: accountRequiresPurchaseOrderMessage(
                accountInvoicingContext.accountDisplayName,
              ),
              path: ['purchaseOrderRef'],
            });
          }
        }
        const rn = (data.riderName ?? '').trim();
        const re = (data.riderEmail ?? '').trim();
        const rp = (data.riderPhone ?? '').trim();
        if (rn.length > 200) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Rider name must be at most 200 characters',
            path: ['riderName'],
          });
        }
        if (re && !z.string().email().safeParse(re).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid rider email address',
            path: ['riderEmail'],
          });
        }
        if (rp && !/^(\+27|0)[0-9]{9}$/.test(rp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid South African rider phone number',
            path: ['riderPhone'],
          });
        }
      });
  }, [accountInvoicingContext]);

  const form = useForm<ContactDetailsFormData>({
    resolver: zodResolver(contactSchemaWithPo),
    defaultValues: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      flightNumber: '',
      purchaseOrderRef: savedPurchaseOrderRef || '',
      riderName: riderContact?.name ?? '',
      riderEmail: riderContact?.email ?? '',
      riderPhone: riderContact?.phone ?? '',
    },
  });

  const watchedEmail = useWatch({ control: form.control, name: 'email' }) ?? '';

  const handleSubmit = form.handleSubmit((data) => {
    if (
      enableAccountDomainPrompt &&
      accountGateRef.current &&
      !accountGateRef.current.ensureReadyForSubmit()
    ) {
      return;
    }
    onSubmit(data);
  });

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={disabled} className="space-y-6 border-0 p-0 m-0 min-w-0">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...field}
                  aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
                  aria-invalid={!!form.formState.errors.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  {...field}
                  aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                  aria-invalid={!!form.formState.errors.email}
                />
              </FormControl>
              <FormMessage />
              {enableAccountDomainPrompt ? (
                <BookingAccountDomainGate
                  ref={accountGateRef}
                  email={watchedEmail}
                  enabled={!disabled && !portalRebookLocksDomainGate}
                />
              ) : null}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 12 345 6789 or 012 345 6789"
                  {...field}
                  aria-describedby={form.formState.errors.phone ? 'phone-error' : undefined}
                  aria-invalid={!!form.formState.errors.phone}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-slate-500 mt-1">
                Format: +27 12 345 6789 or 012 345 6789
              </p>
            </FormItem>
          )}
        />

        {showFlightNumber && (
          <FormField
            control={form.control}
            name="flightNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="flightNumber">Flight Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    id="flightNumber"
                    type="text"
                    placeholder="SA123"
                    {...field}
                    aria-describedby={
                      form.formState.errors.flightNumber ? 'flightNumber-error' : undefined
                    }
                    aria-invalid={!!form.formState.errors.flightNumber}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {accountInvoicingContext?.defaultPoRequired ? (
          <FormField
            control={form.control}
            name="purchaseOrderRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="purchaseOrderRef">
                  Purchase order reference <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    id="purchaseOrderRef"
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. PO-2026-0042"
                    {...field}
                    aria-describedby={
                      form.formState.errors.purchaseOrderRef ? 'purchaseOrderRef-error' : undefined
                    }
                    aria-invalid={!!form.formState.errors.purchaseOrderRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-4">
          <p className="text-sm font-medium text-slate-900">Rider / passenger contact (optional)</p>
          <p className="text-xs text-slate-600">
            If someone other than you is travelling, add their details so we can reach the passenger for
            confirmations. Leave blank if you are the traveller.
          </p>
          <FormField
            control={form.control}
            name="riderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="riderName">Rider name</FormLabel>
                <FormControl>
                  <Input
                    id="riderName"
                    type="text"
                    autoComplete="name"
                    placeholder="Optional"
                    {...field}
                    value={field.value ?? ''}
                    aria-invalid={!!form.formState.errors.riderName}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="riderEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="riderEmail">Rider email</FormLabel>
                <FormControl>
                  <Input
                    id="riderEmail"
                    type="email"
                    autoComplete="off"
                    placeholder="Optional"
                    {...field}
                    value={field.value ?? ''}
                    aria-invalid={!!form.formState.errors.riderEmail}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="riderPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="riderPhone">Rider phone (South Africa)</FormLabel>
                <FormControl>
                  <Input
                    id="riderPhone"
                    type="tel"
                    autoComplete="off"
                    placeholder="+27 12 345 6789 or 012 345 6789"
                    {...field}
                    value={field.value ?? ''}
                    aria-invalid={!!form.formState.errors.riderPhone}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-slate-500 mt-1">Same format as your phone above.</p>
              </FormItem>
            )}
          />
        </div>
        </fieldset>
      </form>
    </Form>
  );
}

