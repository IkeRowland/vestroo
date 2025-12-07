import type { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const AboutUs: GlobalConfig = {
  slug: 'about-us',
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
        description: 'Main content area (company history, mission, values)',
      },
    },
    {
      name: 'team_section',
      type: 'richText',
      label: 'Team Section',
      admin: {
        description: 'Team member information (optional)',
      },
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Statistics',
      admin: {
        description: 'Key statistics to display (optional)',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Label',
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Value',
        },
      ],
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
        // Revalidate about page and related pages when content is updated
        revalidatePath('/')
        revalidatePath('/about')
        revalidatePath('/contact')
      },
    ],
  },
}

