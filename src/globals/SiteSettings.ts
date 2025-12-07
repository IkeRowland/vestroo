import { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true, // Public read access
    update: ({ req: { user } }) => user?.role === 'admin', // Admin-only update
  },
  hooks: {
    afterChange: [
      () => {
        revalidatePath('/', 'layout')
      },
    ],
  },
  fields: [
    // Top Bar Settings
    {
      name: 'top_bar',
      type: 'group',
      label: 'Top Bar',
      fields: [
        {
          name: 'company_name',
          type: 'text',
          label: 'Company Name',
          required: true,
          defaultValue: 'VESTROO SHUTTLE SERVICES',
        },
        {
          name: 'phone_numbers',
          type: 'array',
          label: 'Phone Numbers',
          minRows: 1,
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Label (optional)',
            },
            {
              name: 'number',
              type: 'text',
              label: 'Phone Number',
              required: true,
            },
          ],
          defaultValue: [
            { number: '+27 (0) 861 397 488' },
            { number: '+27 (0) 12 346 0899' },
          ],
        },
        {
          name: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
          defaultValue: 'info@vestroo.co.za',
        },
        {
          name: 'client_login_text',
          type: 'text',
          label: 'Client Login Text',
          defaultValue: 'CLIENT LOGIN',
        },
        {
          name: 'client_login_url',
          type: 'text',
          label: 'Client Login URL',
          defaultValue: '/admin',
        },
      ],
    },

    // Header Settings
    {
      name: 'header',
      type: 'group',
      label: 'Header',
      fields: [
        {
          name: 'logo_type',
          type: 'select',
          label: 'Logo Type',
          options: [
            { label: 'Text Only', value: 'text' },
            { label: 'Image', value: 'image' },
          ],
          defaultValue: 'text',
          required: true,
        },
        {
          name: 'logo_text',
          type: 'text',
          label: 'Logo Text',
          defaultValue: 'V',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'text',
          },
        },
        {
          name: 'logo_image_url',
          type: 'text',
          label: 'Logo Image URL',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'image',
            description: 'Enter image URL (or upload below)',
          },
        },
        {
          name: 'logo_image_upload',
          type: 'upload',
          label: 'Logo Image Upload',
          relationTo: 'media',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'image',
            description: 'Upload logo image from media collection',
          },
        },
        {
          name: 'company_name',
          type: 'text',
          label: 'Company Name',
          required: true,
          defaultValue: 'Vestroo',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'text',
          },
        },
        {
          name: 'tagline',
          type: 'text',
          label: 'Tagline',
          defaultValue: 'Your ride is here',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'text',
          },
        },
        {
          name: 'navigation_links',
          type: 'array',
          label: 'Navigation Links',
          minRows: 1,
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Link Label',
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'Link URL',
              required: true,
            },
          ],
          defaultValue: [
            { label: 'MAKE A BOOKING', url: '/book/search' },
            { label: 'ABOUT', url: '/about' },
            { label: 'CONTACT', url: '/contact' },
          ],
        },
      ],
    },

    // Footer Settings
    {
      name: 'footer',
      type: 'group',
      label: 'Footer',
      fields: [
        {
          name: 'logo_type',
          type: 'select',
          label: 'Logo Type',
          options: [
            { label: 'Text Only', value: 'text' },
            { label: 'Image', value: 'image' },
          ],
          defaultValue: 'text',
          required: true,
        },
        {
          name: 'logo_text',
          type: 'text',
          label: 'Logo Text',
          defaultValue: 'V',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'text',
          },
        },
        {
          name: 'logo_image_url',
          type: 'text',
          label: 'Logo Image URL',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'image',
            description: 'Enter image URL (or upload below)',
          },
        },
        {
          name: 'logo_image_upload',
          type: 'upload',
          label: 'Logo Image Upload',
          relationTo: 'media',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'image',
            description: 'Upload logo image from media collection',
          },
        },
        {
          name: 'company_name',
          type: 'text',
          label: 'Company Name',
          required: true,
          defaultValue: 'Vestroo',
          admin: {
            condition: (_data, siblingData) => siblingData?.logo_type === 'text',
          },
        },
        {
          name: 'social_media',
          type: 'array',
          label: 'Social Media Links',
          fields: [
            {
              name: 'platform',
              type: 'select',
              label: 'Platform',
              options: [
                { label: 'Twitter', value: 'twitter' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'Facebook', value: 'facebook' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'LinkedIn', value: 'linkedin' },
              ],
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'URL',
              required: true,
            },
          ],
        },
        {
          name: 'general_links',
          type: 'array',
          label: 'General Links',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Link Label',
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'Link URL',
              required: true,
            },
          ],
          defaultValue: [
            { label: 'Bookings', url: '/book/search' },
            { label: 'About Us', url: '/about' },
            { label: 'Contact', url: '/contact' },
          ],
        },
        {
          name: 'contact_links',
          type: 'array',
          label: 'Get In Contact Links',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Link Label',
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'Link URL',
              required: true,
            },
          ],
          defaultValue: [
            { label: 'Head Office', url: '/contact' },
            { label: 'Customer Care', url: '/contact' },
            { label: 'Rate Our Service', url: '/contact' },
          ],
        },
        {
          name: 'careers',
          type: 'group',
          label: 'Careers Section',
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              label: 'Show Careers Section',
              defaultValue: true,
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Description',
              defaultValue:
                'We are always looking for new drivers, call centre staff and other general staff who would like to join our growing and dynamic team.',
            },
            {
              name: 'button_text',
              type: 'text',
              label: 'Button Text',
              defaultValue: 'Upload your CV',
            },
            {
              name: 'button_url',
              type: 'text',
              label: 'Button URL',
              defaultValue: '/careers',
            },
          ],
        },
        {
          name: 'copyright_text',
          type: 'text',
          label: 'Copyright Text',
          defaultValue: '© Copyright {year}. All Rights Reserved By Vestroo',
          admin: {
            description: 'Use {year} as placeholder for current year',
          },
        },
        {
          name: 'terms_url',
          type: 'text',
          label: 'Terms and Conditions URL',
          defaultValue: '/terms',
        },
        {
          name: 'terms_text',
          type: 'text',
          label: 'Terms and Conditions Text',
          defaultValue: 'TERMS AND CONDITIONS',
        },
      ],
    },
  ],
}

