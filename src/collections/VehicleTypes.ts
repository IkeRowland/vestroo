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

export const VehicleTypes: CollectionConfig = {
  slug: 'vehicle-types',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price_multiplier', 'passenger_capacity', 'luggage_capacity', 'is_active'],
    group: 'Pricing',
    listSearchableFields: ['name', 'slug'],
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
  },
  access: {
    create: ({ req: { user } }) => {
      // Only allow admin users to create vehicle types
      return user?.role === 'admin'
    },
    read: ({ req: { user } }) => {
      // Only allow admin users to read vehicle types
      return user?.role === 'admin'
    },
    update: ({ req: { user } }) => {
      // Only allow admin users to update vehicle types
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only allow admin users to delete vehicle types
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
      admin: {
        description: 'Display name for the vehicle type (e.g., "Premium Sedan", "8-Seater Van")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        description: 'Auto-generated URL-safe identifier',
        readOnly: true,
      },
    },
    {
      name: 'price_multiplier',
      type: 'number',
      required: true,
      label: 'Price Multiplier',
      admin: {
        description: 'Multiplier applied to route base_price (e.g., 1.0 for base, 1.5 for premium)',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Price multiplier is required'
        }
        if (value < 0.1) {
          return 'Price multiplier must be at least 0.1'
        }
        return true
      },
    },
    {
      name: 'passenger_capacity',
      type: 'number',
      required: true,
      label: 'Passenger Capacity',
      admin: {
        description: 'Maximum number of passengers',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Passenger capacity is required'
        }
        if (value < 1 || !Number.isInteger(value)) {
          return 'Passenger capacity must be a positive integer (minimum 1)'
        }
        return true
      },
    },
    {
      name: 'luggage_capacity',
      type: 'number',
      required: true,
      label: 'Luggage Capacity',
      admin: {
        description: 'Maximum number of luggage pieces',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Luggage capacity is required'
        }
        if (value < 0 || !Number.isInteger(value)) {
          return 'Luggage capacity must be a non-negative integer (minimum 0)'
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
        description: 'Make this vehicle type available for booking',
      },
    },
    {
      name: 'image_url',
      type: 'text',
      label: 'Image URL',
      admin: {
        description: 'URL to vehicle image for display in booking flow',
      },
      validate: (value: string | null | undefined) => {
        if (!value) {
          return true // Optional field
        }
        try {
          new URL(value)
          return true
        } catch {
          return 'Image URL must be a valid URL'
        }
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
              collection: 'vehicle-types',
              id: currentId,
            })
          } catch (error) {
            // Document might not exist yet, continue
          }
        }

        // Generate slug from name if name is provided and slug is not set or name changed
        const name = data.name || currentDoc?.name
        const currentSlug = data.slug || currentDoc?.slug

        if (name) {
          const baseSlug = slugify(name)
          let finalSlug = baseSlug
          let counter = 1

          // Ensure slug uniqueness
          while (true) {
            const existing = await req.payload.find({
              collection: 'vehicle-types',
              where: {
                slug: {
                  equals: finalSlug,
                },
              },
              limit: 1,
            })

            // If updating and slug matches current document, it's valid
            if (
              operation === 'update' &&
              currentId &&
              existing.docs.length > 0 &&
              existing.docs[0].id === currentId
            ) {
              break
            }

            // If slug is unique or matches current document, use it
            if (existing.docs.length === 0) {
              break
            }

            // Slug exists, try with counter
            finalSlug = `${baseSlug}-${counter}`
            counter++
          }

          data.slug = finalSlug
        } else if (!currentSlug) {
          // If no name and no existing slug, generate a default
          data.slug = `vehicle-type-${Date.now()}`
        }

        return data
      },
    ],
  },
  timestamps: true,
}

