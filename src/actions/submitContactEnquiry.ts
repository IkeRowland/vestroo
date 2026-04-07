'use server'

import { z } from 'zod'

const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Valid email required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  message: z.string().trim().min(1, 'Message is required'),
})

export type ContactFormState = {
  ok: boolean
  error: string | null
  fieldErrors?: Partial<Record<'name' | 'email' | 'phone' | 'message', string>>
}

export async function submitContactEnquiry(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    message: formData.get('message'),
  }

  const parsed = enquirySchema.safeParse({
    name: typeof raw.name === 'string' ? raw.name : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    message: typeof raw.message === 'string' ? raw.message : '',
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      error: 'Please correct the highlighted fields.',
      fieldErrors: {
        name: flat.name?.[0],
        email: flat.email?.[0],
        phone: flat.phone?.[0],
        message: flat.message?.[0],
      },
    }
  }

  // TODO(VST-13+): wire Resend / CRM when product owner confirms channel and templates.
  console.info('[contact] enquiry received', {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    messageLength: parsed.data.message.length,
  })

  return { ok: true, error: null }
}
