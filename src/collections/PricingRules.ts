import type { CollectionConfig } from 'payload'

// Helper function to validate time format (HH:mm)
const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}

// Helper function to compare times
const compareTimes = (time1: string, time2: string): number => {
  const [h1, m1] = time1.split(':').map(Number)
  const [h2, m2] = time2.split(':').map(Number)
  const minutes1 = h1 * 60 + m1
  const minutes2 = h2 * 60 + m2
  return minutes1 - minutes2
}

export const PricingRules: CollectionConfig = {
  slug: 'pricing-rules',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price_modifier_percent', 'priority', 'is_active'],
    group: 'Pricing',
    listSearchableFields: ['name'],
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
  },
  access: {
    create: ({ req: { user } }) => {
      // Only allow admin users to create pricing rules
      return user?.role === 'admin'
    },
    read: ({ req: { user } }) => {
      // Only allow admin users to read pricing rules
      return user?.role === 'admin'
    },
    update: ({ req: { user } }) => {
      // Only allow admin users to update pricing rules
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only allow admin users to delete pricing rules
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
        description: 'Descriptive name for the rule (e.g., "Peak Hours", "Weekend Surcharge")',
      },
    },
    {
      name: 'route_id',
      type: 'relationship',
      relationTo: 'routes',
      label: 'Route',
      admin: {
        description: 'Specific route this rule applies to (leave empty to apply to all routes)',
      },
    },
    {
      name: 'vehicle_type_id',
      type: 'relationship',
      relationTo: 'vehicle-types',
      label: 'Vehicle Type',
      admin: {
        description: 'Specific vehicle type this rule applies to (leave empty to apply to all vehicle types)',
      },
    },
    {
      name: 'price_modifier_percent',
      type: 'number',
      required: true,
      label: 'Price Modifier (%)',
      admin: {
        description: 'Percentage adjustment (e.g., 20 for +20%, -10 for -10%)',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Price modifier is required'
        }
        if (value < -50 || value > 200) {
          return 'Price modifier must be between -50% and +200%'
        }
        return true
      },
    },
    {
      name: 'day_of_week',
      type: 'select',
      label: 'Day of Week',
      admin: {
        description: 'Specific day(s) of week (leave empty to apply to all days)',
      },
      options: [
        {
          label: 'All',
          value: 'all',
        },
        {
          label: 'Monday',
          value: 'monday',
        },
        {
          label: 'Tuesday',
          value: 'tuesday',
        },
        {
          label: 'Wednesday',
          value: 'wednesday',
        },
        {
          label: 'Thursday',
          value: 'thursday',
        },
        {
          label: 'Friday',
          value: 'friday',
        },
        {
          label: 'Saturday',
          value: 'saturday',
        },
        {
          label: 'Sunday',
          value: 'sunday',
        },
      ],
    },
    {
      name: 'start_time',
      type: 'text',
      label: 'Start Time',
      admin: {
        description: 'Start time in HH:mm format (e.g., "08:00" for 8 AM)',
      },
      validate: (value: string | null | undefined) => {
        if (!value) {
          return true // Optional field
        }
        if (!isValidTimeFormat(value)) {
          return 'Start time must be in HH:mm format (e.g., "08:00")'
        }
        return true
      },
    },
    {
      name: 'end_time',
      type: 'text',
      label: 'End Time',
      admin: {
        description: 'End time in HH:mm format (e.g., "18:00" for 6 PM)',
      },
      validate: (value: string | null | undefined) => {
        if (!value) {
          return true // Optional field
        }
        if (!isValidTimeFormat(value)) {
          return 'End time must be in HH:mm format (e.g., "18:00")'
        }
        return true
      },
    },
    {
      name: 'start_date',
      type: 'date',
      label: 'Start Date',
      admin: {
        description: 'Rule start date (for seasonal/holiday pricing)',
      },
    },
    {
      name: 'end_date',
      type: 'date',
      label: 'End Date',
      admin: {
        description: 'Rule end date (for seasonal/holiday pricing)',
      },
    },
    {
      name: 'priority',
      type: 'number',
      required: true,
      defaultValue: 100,
      label: 'Priority',
      admin: {
        description: 'Rule priority/order (lower number = higher priority, applied first)',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Priority is required'
        }
        if (value < 1 || !Number.isInteger(value)) {
          return 'Priority must be a positive integer (minimum 1)'
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
        description: 'Make this pricing rule active',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        if (!data) {
          return data
        }

        // Validate time range (start_time < end_time if both provided)
        if (data.start_time && data.end_time) {
          if (!isValidTimeFormat(data.start_time) || !isValidTimeFormat(data.end_time)) {
            // Individual field validation will catch format errors
            return data
          }
          if (compareTimes(data.start_time, data.end_time) >= 0) {
            throw new Error('Start time must be before end time')
          }
        }

        // Validate date range (start_date <= end_date if both provided)
        if (data.start_date && data.end_date) {
          const startDate = new Date(data.start_date)
          const endDate = new Date(data.end_date)
          if (startDate > endDate) {
            throw new Error('Start date must be before or equal to end date')
          }
        }

        return data
      },
    ],
  },
  timestamps: true,
}

