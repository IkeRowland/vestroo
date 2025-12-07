'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

// Zod schema for contact details validation
const contactDetailsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^(\+27|0)[0-9]{9}$/, 'Invalid South African phone number'),
  flightNumber: z.string().optional(),
});

export type ContactDetailsFormData = z.infer<typeof contactDetailsSchema>;

interface ContactDetailsFormProps {
  onSubmit: (data: ContactDetailsFormData) => void;
  showFlightNumber?: boolean;
}

export function ContactDetailsForm({ onSubmit, showFlightNumber = false }: ContactDetailsFormProps) {
  const { customer } = useBookingStore();

  const form = useForm<ContactDetailsFormData>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      flightNumber: '',
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
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
      </form>
    </Form>
  );
}

