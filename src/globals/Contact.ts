import type { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const Contact: GlobalConfig = {
  slug: 'contact',
  admin: {
    group: 'Marketing',
  },
  access: {
    read: () => {
      // Public read access (for frontend rendering)
      return true
    },
    update: ({ req: { user } }) => {
      // Admin-only update access
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'page_title',
      type: 'text',
      required: true,
      label: 'Page Title',
      admin: {
        description: 'Main page heading',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Content',
      admin: {
        description: 'Introduction text or instructions',
      },
    },
    {
      name: 'contact_info',
      type: 'group',
      label: 'Contact Information',
      fields: [
        {
          name: 'phone',
          type: 'text',
          required: true,
          label: 'Phone',
          admin: {
            description: 'Primary phone number',
          },
        },
        {
          name: 'email',
          type: 'email',
          required: true,
          label: 'Email',
          admin: {
            description: 'Contact email address',
          },
        },
        {
          name: 'address',
          type: 'textarea',
          required: true,
          label: 'Address',
          admin: {
            description: 'Physical address',
          },
        },
        {
          name: 'office_hours',
          type: 'textarea',
          label: 'Office Hours',
          admin: {
            description: 'Business hours information (optional)',
          },
        },
      ],
    },
    {
      name: 'contact_form_enabled',
      type: 'checkbox',
      label: 'Contact Form Enabled',
      defaultValue: true,
      admin: {
        description: 'Toggle to show/hide contact form',
      },
    },
    {
      name: 'meta_title',
      type: 'text',
      label: 'Meta Title',
      admin: {
        description: 'SEO meta title (optional)',
      },
    },
    {
      name: 'meta_description',
      type: 'textarea',
      label: 'Meta Description',
      admin: {
        description: 'SEO meta description (optional)',
      },
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        // Revalidate contact page and related pages when content is updated
        revalidatePath('/')
        revalidatePath('/about')
        revalidatePath('/contact')
      },
    ],
  },
}

