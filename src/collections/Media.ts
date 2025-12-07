import { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true, // Public read access
    create: ({ req: { user } }) => user?.role === 'admin', // Admin-only create
    update: ({ req: { user } }) => user?.role === 'admin', // Admin-only update
    delete: ({ req: { user } }) => user?.role === 'admin', // Admin-only delete
  },
  upload: {
    staticDir: 'media',
    // Allow both images and videos
    mimeTypes: ['image/*', 'video/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt Text',
      admin: {
        description: 'Alternative text for accessibility (for images)',
      },
    },
  ],
}

