import { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: {
    group: 'Marketing',
  },
  access: {
    read: () => true, // Public read access
    update: ({ req: { user } }) => user?.role === 'admin', // Admin-only update
  },
  fields: [
    // SEO
    {
      name: 'seo',
      type: 'group',
      label: 'SEO Settings',
      fields: [
        {
          name: 'meta_title',
          type: 'text',
          label: 'Meta Title',
          required: true,
          defaultValue: 'Vestroo - Premium Shuttle Service',
        },
        {
          name: 'meta_description',
          type: 'textarea',
          label: 'Meta Description',
          required: true,
          defaultValue: 'Book your premium shuttle service with Vestroo',
        },
      ],
    },

    // Hero Slider Section
    {
      name: 'hero_slider',
      type: 'group',
      label: 'Hero Slider Section',
      fields: [
        {
          name: 'slides',
          type: 'array',
          label: 'Hero Slides',
          minRows: 1,
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Title',
              required: true,
              defaultValue: 'Hybrid Transfers Putting Clients And The Planet First',
            },
            {
              name: 'subtitle',
              type: 'text',
              label: 'Subtitle',
              admin: {
                description: 'Optional subtitle (e.g., "DOWNLOAD THE APP")',
              },
            },
            {
              name: 'background_type',
              type: 'select',
              label: 'Background Type',
              options: [
                { label: 'Image', value: 'image' },
                { label: 'Video', value: 'video' },
              ],
              defaultValue: 'image',
              required: true,
            },
            {
              name: 'background_image_url',
              type: 'text',
              label: 'Background Image URL',
              required: false,
              admin: {
                condition: (_data, siblingData) => {
                  return siblingData?.background_type === 'image'
                },
                description: 'Enter image URL (or upload below)',
              },
            },
            {
              name: 'background_image_upload',
              type: 'upload',
              label: 'Background Image Upload',
              relationTo: 'media',
              required: false,
              admin: {
                condition: (_data, siblingData) => {
                  // Show when background_type is 'image' or not set yet (for initial display)
                  const bgType = siblingData?.background_type
                  return !bgType || bgType === 'image'
                },
                description: 'Upload an image file from media collection (or use URL above). Select "Image" in Background Type above to see this field.',
              },
            },
            {
              name: 'background_video_url',
              type: 'text',
              label: 'Background Video URL',
              required: false,
              admin: {
                condition: (_data, siblingData) => {
                  return siblingData?.background_type === 'video'
                },
                description: 'Enter video URL (YouTube, Vimeo, or direct video file)',
              },
            },
            {
              name: 'background_video_upload',
              type: 'upload',
              label: 'Background Video Upload',
              relationTo: 'media',
              required: false,
              admin: {
                condition: (_data, siblingData) => {
                  // Show when background_type is 'video'
                  const bgType = siblingData?.background_type
                  return bgType === 'video'
                },
                description: 'Upload a video file from media collection (or use URL above). Select "Video" in Background Type above to see this field.',
              },
            },
            {
              name: 'show_app_download',
              type: 'checkbox',
              label: 'Show App Download Buttons',
              defaultValue: true,
            },
            {
              name: 'app_store_link',
              type: 'text',
              label: 'App Store Link',
              admin: {
                condition: (data) => data.show_app_download,
              },
            },
            {
              name: 'google_play_link',
              type: 'text',
              label: 'Google Play Link',
              admin: {
                condition: (data) => data.show_app_download,
              },
            },
          ],
        },
      ],
    },

    // Great Journeys Section
    {
      name: 'great_journeys',
      type: 'group',
      label: 'Great Journeys Section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          defaultValue: 'GREAT JOURNEYS BEGIN WITH AN EZ',
        },
        {
          name: 'subtitle',
          type: 'text',
          label: 'Subtitle (with red border)',
          admin: {
            description: 'Subtitle displayed in a red bordered box',
          },
          defaultValue: 'SAFE, COMFORTABLE, HASSLE-FREE AIRPORT TRANSFERS',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          required: true,
          defaultValue:
            "Looking for a convenient transport solution for your business operation, staff, friends, or family travelling to the airport, hotel or to a meeting? EZ Shuttle is the convenient and reliable answer. We're South Africa's largest private transfer provider and are trusted by thousands of people on a daily basis. Why? Because we got them safely from Point A to Point B with zero stress or fuss - and we'll throw in a smile for good measure (because that's the Mzanzi way!)",
        },
      ],
    },

    // Ten Reasons Section (Value Propositions)
    {
      name: 'ten_reasons',
      type: 'group',
      label: 'Ten Reasons Section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section Title',
          required: true,
          defaultValue: 'TEN GREAT REASONS TO CHOOSE EZ SHUTTLE',
        },
        {
          name: 'subtitle',
          type: 'textarea',
          label: 'Subtitle',
          defaultValue:
            "Established in 2006, we have perfected the art of stress-free collection and drop-off. Here are ten good reasons to book your next transfer with us:",
        },
        {
          name: 'items',
          type: 'array',
          label: 'Reasons',
          minRows: 1,
          maxRows: 10,
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Reason Title',
              required: true,
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Description',
            },
          ],
        },
        {
          name: 'image_url',
          type: 'text',
          label: 'Van Image URL',
          admin: {
            description: 'URL for the van/driver image shown below the reasons',
          },
        },
        {
          name: 'image_upload',
          type: 'upload',
          label: 'Van Image Upload',
          relationTo: 'media',
          required: false,
          admin: {
            description: 'Upload van/driver image (or use URL above)',
          },
        },
      ],
    },

    // Mission Statement Section
    {
      name: 'mission_statement',
      type: 'group',
      label: 'Mission Statement Section',
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          label: 'Quote',
          required: true,
          defaultValue:
            'OUR MISSION IS TO MAKE PASSENGER TRANSPORT SAFE AND EASY TO BOOK AND USE - EVERYTHING WE DO IS IN SUPPORT OF THIS SIMPLE, YET COMPLEX GOAL.',
        },
        {
          name: 'author',
          type: 'text',
          label: 'Author Name',
          defaultValue: 'GUYCE VAN HEERDEN',
        },
        {
          name: 'author_title',
          type: 'text',
          label: 'Author Title',
          defaultValue: 'MANAGING DIRECTOR',
        },
      ],
    },

    // App Download Section
    {
      name: 'app_download',
      type: 'group',
      label: 'App Download Section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          defaultValue: 'Download the EZ Shuttle App',
        },
        {
          name: 'headline',
          type: 'text',
          label: 'Headline',
          required: true,
          defaultValue: 'Safe reliable transfers in the palm of your hand',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          defaultValue:
            'Download our app for iOS and Android to book transfers, track your ride, and manage your bookings on the go. More than 10,000 downloads and counting!',
        },
        {
          name: 'app_store_link',
          type: 'text',
          label: 'App Store Link',
        },
        {
          name: 'google_play_link',
          type: 'text',
          label: 'Google Play Link',
        },
        {
          name: 'app_screenshot_url',
          type: 'text',
          label: 'App Screenshot URL',
          admin: {
            description: 'URL for the app screenshot image',
          },
        },
        {
          name: 'app_screenshot_upload',
          type: 'upload',
          label: 'App Screenshot Upload',
          relationTo: 'media',
          required: false,
          admin: {
            description: 'Upload app screenshot image (or use URL above)',
          },
        },
        {
          name: 'qr_code_app_store_url',
          type: 'text',
          label: 'App Store QR Code URL',
          admin: {
            description: 'URL for App Store QR code image',
          },
        },
        {
          name: 'qr_code_google_play_url',
          type: 'text',
          label: 'Google Play QR Code URL',
          admin: {
            description: 'URL for Google Play QR code image',
          },
        },
      ],
    },

    // Partners Section
    {
      name: 'partners',
      type: 'group',
      label: 'Partners Section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section Title',
          defaultValue: 'OUR PARTNERS',
        },
        {
          name: 'logos',
          type: 'array',
          label: 'Partner Logos',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Partner Name',
              required: true,
            },
            {
              name: 'logo_url',
              type: 'text',
              label: 'Logo URL',
              admin: {
                description: 'Enter logo URL or leave empty to upload',
              },
            },
            {
              name: 'logo_upload',
              type: 'upload',
              label: 'Logo Upload',
              relationTo: 'media',
              required: false,
              admin: {
                description: 'Upload logo file (or use URL above)',
              },
            },
            {
              name: 'link',
              type: 'text',
              label: 'Partner Website Link',
              admin: {
                description: 'Optional link to partner website',
              },
            },
          ],
        },
      ],
    },

    // Testimonials Section
    {
      name: 'testimonials',
      type: 'group',
      label: 'Testimonials Section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section Title',
          defaultValue: 'WHAT OUR CLIENTS SAY',
        },
        {
          name: 'subtitle',
          type: 'text',
          label: 'Subtitle',
          defaultValue: 'TESTIMONIALS',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          defaultValue:
            'Looking for objective confirmation of the service excellence we offer?',
        },
        {
          name: 'items',
          type: 'array',
          label: 'Testimonials',
          fields: [
            {
              name: 'quote',
              type: 'textarea',
              label: 'Customer Quote',
              required: true,
            },
            {
              name: 'rating',
              type: 'number',
              label: 'Rating',
              min: 1,
              max: 5,
              defaultValue: 5,
              required: true,
            },
            {
              name: 'customer_name',
              type: 'text',
              label: 'Customer Name',
              required: true,
            },
            {
              name: 'photo_url',
              type: 'text',
              label: 'Customer Photo URL',
              admin: {
                description: 'Enter photo URL or leave empty to upload',
              },
            },
            {
              name: 'photo_upload',
              type: 'upload',
              label: 'Customer Photo Upload',
              relationTo: 'media',
              required: false,
              admin: {
                description: 'Upload customer photo (or use URL above)',
              },
            },
          ],
        },
      ],
    },

    // Call to Action (if needed, can be removed if not in design)
    {
      name: 'cta_section',
      type: 'group',
      label: 'Call to Action Section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          defaultValue: 'Ready to book your ride?',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
        },
        {
          name: 'button_text',
          type: 'text',
          label: 'Button Text',
          defaultValue: 'Book Now',
        },
        {
          name: 'button_link',
          type: 'text',
          label: 'Button Link',
          defaultValue: '/book/search',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async () => {
        // Revalidate the homepage when content changes
        revalidatePath('/', 'page')
      },
    ],
  },
}
