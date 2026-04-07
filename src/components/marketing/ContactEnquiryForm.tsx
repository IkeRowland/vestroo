'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  submitContactEnquiry,
  type ContactFormState,
} from '@/actions/submitContactEnquiry'
import { Button } from '@/components/ui/button'

const initialState: ContactFormState = { ok: false, error: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#bc4328] hover:bg-[#a83a22] text-white font-semibold py-3"
    >
      {pending ? 'Sending…' : 'Submit enquiry'}
    </Button>
  )
}

export function ContactEnquiryForm() {
  const [state, formAction] = useActionState(submitContactEnquiry, initialState)

  if (state.ok) {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-900"
      >
        <p className="font-semibold">Thank you</p>
        <p className="mt-2 text-sm">
          We have received your enquiry and will respond as soon as possible.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Your name <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          aria-invalid={state.fieldErrors?.name ? true : undefined}
          aria-describedby={
            state.fieldErrors?.name ? 'contact-name-error' : undefined
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#bc4328]"
        />
        {state.fieldErrors?.name ? (
          <p id="contact-name-error" className="mt-1 text-sm text-red-600">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={
            state.fieldErrors?.email ? 'contact-email-error' : undefined
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#bc4328]"
        />
        {state.fieldErrors?.email ? (
          <p id="contact-email-error" className="mt-1 text-sm text-red-600">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="contact-phone"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          aria-invalid={state.fieldErrors?.phone ? true : undefined}
          aria-describedby={
            state.fieldErrors?.phone ? 'contact-phone-error' : undefined
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#bc4328]"
        />
        {state.fieldErrors?.phone ? (
          <p id="contact-phone-error" className="mt-1 text-sm text-red-600">
            {state.fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          aria-invalid={state.fieldErrors?.message ? true : undefined}
          aria-describedby={
            state.fieldErrors?.message ? 'contact-message-error' : undefined
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#bc4328]"
        />
        {state.fieldErrors?.message ? (
          <p id="contact-message-error" className="mt-1 text-sm text-red-600">
            {state.fieldErrors.message}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  )
}
