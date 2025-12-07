import type { CollectionConfig } from 'payload'

// Helper function to generate URL-safe slug
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

const generateSlug = (origin: string, destination: string): string => {
  return `${slugify(origin)}-to-${slugify(destination)}`
}

export const Routes: CollectionConfig = {
  slug: 'routes',
  admin: {
    useAsTitle: 'origin_name',
    defaultColumns: ['origin_name', 'destination_name', 'base_price', 'is_active'],
    group: 'Content',
    listSearchableFields: ['origin_name', 'destination_name', 'slug'],
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
  },
  access: {
    create: ({ req: { user } }) => {
      // Only allow admin users to create routes
      return user?.role === 'admin'
    },
    read: ({ req: { user } }) => {
      // Only allow admin users to read routes
      return user?.role === 'admin'
    },
    update: ({ req: { user } }) => {
      // Only allow admin users to update routes
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only allow admin users to delete routes
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'origin_name',
      type: 'text',
      required: true,
      label: 'Origin Name',
      admin: {
        description: 'Display name for the pickup location (e.g., "OR Tambo Airport")',
      },
    },
    {
      name: 'destination_name',
      type: 'text',
      required: true,
      label: 'Destination Name',
      admin: {
        description: 'Display name for the drop-off location (e.g., "Sandton City")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        description: 'Auto-generated SEO-friendly URL slug',
        readOnly: true,
      },
    },
    {
      name: 'base_price',
      type: 'number',
      required: true,
      label: 'Base Price',
      admin: {
        description: 'Base price for the route',
      },
      validate: (value: number | null | undefined) => {
        if (value !== null && value !== undefined && typeof value === 'number' && value < 0) {
          return 'Base price must be a positive number'
        }
        return true
      },
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
      admin: {
        description: 'Make this route available for booking',
      },
    },
    {
      name: 'seo_content',
      type: 'richText',
      label: 'SEO Content',
      admin: {
        description: 'Custom landing page content for this route',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (!data) {
          return data
        }

        // Get current document data if updating
        let currentDoc = null
        const currentId = data.id
        if (operation === 'update' && currentId) {
          try {
            currentDoc = await req.payload.findByID({
              collection: 'routes',
              id: currentId,
            })
          } catch (error) {
            // Document might not exist yet, continue
            // Error is expected if document doesn't exist, so we continue
          }
        }

        // Get origin and destination values
        const origin = data.origin_name || currentDoc?.origin_name
        const destination = data.destination_name || currentDoc?.destination_name

        // Validate that origin/destination pair is unique
        if (origin && destination) {
          const existing = await req.payload.find({
            collection: 'routes',
            where: {
              and: [
                {
                  origin_name: {
                    equals: origin,
                  },
                },
                {
                  destination_name: {
                    equals: destination,
                  },
                },
              ],
            },
            limit: 1,
          })

          // If updating, exclude current document from check
          if (existing.docs.length > 0) {
            const existingDoc = existing.docs[0]
            if (operation === 'create' || (operation === 'update' && existingDoc.id !== currentId)) {
              throw new Error(`A route with origin "${origin}" and destination "${destination}" already exists.`)
            }
          }
        }

        // Generate slug from origin_name and destination_name
        if (origin && destination) {
          let slug = generateSlug(origin, destination)
          let counter = 1
          let isUnique = false

          // Check for uniqueness and append number if needed
          while (!isUnique) {
            const existing = await req.payload.find({
              collection: 'routes',
              where: {
                slug: {
                  equals: slug,
                },
              },
              limit: 1,
            })

            if (existing.docs.length === 0 || (operation === 'update' && existing.docs[0].id === currentId)) {
              isUnique = true
            } else {
              slug = `${generateSlug(origin, destination)}-${counter}`
              counter++
            }
          }

          data.slug = slug
        }

        return data
      },
    ],
  },
}

