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
    // Use S3 storage adapter configured in payload.config.ts
    // Files will be stored in Supabase Storage
    // Allow both images and videos
    mimeTypes: ['image/*', 'video/*'],
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // Normalize file paths for S3 storage
        // This handles migration from local storage to S3 storage
        if (data && typeof data === 'object') {
          // Normalize URL field in new data
          if ('url' in data && data.url && typeof data.url === 'string') {
            // Remove 'media/' prefix from URL if present (for old files)
            // Old files stored locally had paths like 'media/filename.jpg'
            // New files in S3 are stored at bucket root without prefix
            if (data.url.startsWith('media/')) {
              data.url = data.url.replace(/^media\//, '')
            }
          }
          // Normalize filename field in new data
          if ('filename' in data && data.filename && typeof data.filename === 'string') {
            // Remove 'media/' prefix from filename if present (for old files)
            if (data.filename.startsWith('media/')) {
              data.filename = data.filename.replace(/^media\//, '')
            }
          }

          // Also normalize original document paths to prevent delete errors
          // This helps when updating existing files that have old paths
          if (originalDoc && typeof originalDoc === 'object') {
            if ('url' in originalDoc && originalDoc.url && typeof originalDoc.url === 'string') {
              if (originalDoc.url.startsWith('media/')) {
                // Update the original doc path in place (affects storage plugin's delete operation)
                originalDoc.url = originalDoc.url.replace(/^media\//, '')
              }
            }
            if ('filename' in originalDoc && originalDoc.filename && typeof originalDoc.filename === 'string') {
              if (originalDoc.filename.startsWith('media/')) {
                originalDoc.filename = originalDoc.filename.replace(/^media\//, '')
              }
            }
          }
        }
        return data
      },
    ],
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

