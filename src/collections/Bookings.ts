import type { CollectionConfig } from 'payload'

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'payment_reference',
    defaultColumns: [
      'id',
      'payment_reference',
      'customer_name',
      'pickup_datetime',
      'status',
      'total_amount',
    ],
    group: 'Bookings',
    listSearchableFields: [
      'id',
      'payment_reference',
      'flight_number',
    ],
    pagination: {
      defaultLimit: 25,
      limits: [10, 25, 50, 100],
    },
  },
  access: {
    create: ({ req: { user } }) => {
      // Only allow admin users to create bookings
      return user?.role === 'admin'
    },
    read: ({ req: { user } }) => {
      // Only allow admin users to read bookings
      return user?.role === 'admin'
    },
    update: ({ req: { user } }) => {
      // Only allow admin users to update bookings
      return user?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only allow admin users to delete bookings
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'vehicle_type_id',
      type: 'relationship',
      relationTo: 'vehicle-types',
      required: false,
      label: 'Vehicle Type',
      admin: {
        description: 'The vehicle type selected for this booking (optional - vehicle_id is used for direct bookings)',
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Paid',
          value: 'paid',
        },
        {
          label: 'Confirmed',
          value: 'confirmed',
        },
        {
          label: 'Completed',
          value: 'completed',
        },
        {
          label: 'Cancelled',
          value: 'cancelled',
        },
      ],
      admin: {
        description: 'Current status of the booking',
      },
    },
    {
      name: 'passenger_count',
      type: 'number',
      required: true,
      label: 'Passenger Count',
      admin: {
        description: 'Number of passengers for this booking',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Passenger count is required'
        }
        if (value < 1 || !Number.isInteger(value)) {
          return 'Passenger count must be a positive integer (minimum 1)'
        }
        return true
      },
    },
    {
      name: 'pickup_datetime',
      type: 'date',
      required: true,
      label: 'Pickup Date & Time',
      admin: {
        description: 'Date and time for pickup',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'flight_number',
      type: 'text',
      label: 'Flight Number',
      admin: {
        description: 'Optional flight number for airport pickups',
      },
    },
    {
      name: 'total_amount',
      type: 'number',
      required: true,
      label: 'Total Amount',
      admin: {
        description: 'Total booking amount in currency',
        step: 0.01,
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined || typeof value !== 'number') {
          return 'Total amount is required'
        }
        if (value < 0) {
          return 'Total amount must be a non-negative number'
        }
        return true
      },
    },
    {
      name: 'payment_reference',
      type: 'text',
      required: true,
      label: 'Booking Reference / Payment Reference',
      admin: {
        description: 'Unique booking reference ID (also used as payment reference)',
      },
    },
    // Customer information fields (for direct bookings without user accounts)
    {
      name: 'customer_name',
      type: 'text',
      label: 'Customer Name',
      admin: {
        description: 'Customer name for direct bookings (when user_id is not available)',
        position: 'sidebar',
      },
    },
    {
      name: 'customer_email',
      type: 'email',
      label: 'Customer Email',
      admin: {
        description: 'Customer email for direct bookings',
        position: 'sidebar',
      },
    },
    {
      name: 'customer_phone',
      type: 'text',
      label: 'Customer Phone',
      admin: {
        description: 'Customer phone number for direct bookings',
        position: 'sidebar',
      },
    },
    // Origin and destination fields (for direct bookings)
    {
      name: 'origin_place_id',
      type: 'text',
      label: 'Origin Place ID',
      admin: {
        description: 'Google Places ID for origin',
        position: 'sidebar',
      },
    },
    {
      name: 'origin_address',
      type: 'text',
      label: 'Origin Address',
      admin: {
        description: 'Formatted origin address',
        position: 'sidebar',
      },
    },
    {
      name: 'origin_name',
      type: 'text',
      label: 'Origin Name',
      admin: {
        description: 'Origin location name',
        position: 'sidebar',
      },
    },
    {
      name: 'origin_latitude',
      type: 'number',
      label: 'Origin Latitude',
      admin: {
        description: 'Origin latitude coordinate',
        position: 'sidebar',
        step: 0.00000001,
      },
    },
    {
      name: 'origin_longitude',
      type: 'number',
      label: 'Origin Longitude',
      admin: {
        description: 'Origin longitude coordinate',
        position: 'sidebar',
        step: 0.00000001,
      },
    },
    {
      name: 'destination_place_id',
      type: 'text',
      label: 'Destination Place ID',
      admin: {
        description: 'Google Places ID for destination',
        position: 'sidebar',
      },
    },
    {
      name: 'destination_address',
      type: 'text',
      label: 'Destination Address',
      admin: {
        description: 'Formatted destination address',
        position: 'sidebar',
      },
    },
    {
      name: 'destination_name',
      type: 'text',
      label: 'Destination Name',
      admin: {
        description: 'Destination location name',
        position: 'sidebar',
      },
    },
    {
      name: 'destination_latitude',
      type: 'number',
      label: 'Destination Latitude',
      admin: {
        description: 'Destination latitude coordinate',
        position: 'sidebar',
        step: 0.00000001,
      },
    },
    {
      name: 'destination_longitude',
      type: 'number',
      label: 'Destination Longitude',
      admin: {
        description: 'Destination longitude coordinate',
        position: 'sidebar',
        step: 0.00000001,
      },
    },
    // Additional booking fields
    {
      name: 'trip_date',
      type: 'date',
      label: 'Trip Date',
      admin: {
        description: 'Trip date (alternative to pickup_datetime for compatibility)',
        position: 'sidebar',
      },
    },
    {
      name: 'estimated_duration',
      type: 'number',
      label: 'Estimated Duration (minutes)',
      admin: {
        description: 'Estimated trip duration in minutes',
        position: 'sidebar',
      },
    },
    {
      name: 'distance_km',
      type: 'number',
      label: 'Distance (km)',
      admin: {
        description: 'Trip distance in kilometers',
        position: 'sidebar',
        step: 0.01,
      },
    },
    {
      name: 'vehicle_id',
      type: 'text',
      required: true,
      label: 'Vehicle ID',
      admin: {
        description: 'Vehicle ID selected from booking form (required for all bookings)',
        position: 'sidebar',
      },
    },
    // Payment fields
    {
      name: 'payment_status',
      type: 'select',
      label: 'Payment Status',
      defaultValue: 'pending',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Paid',
          value: 'paid',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
        {
          label: 'Processing',
          value: 'processing',
        },
      ],
      admin: {
        description: 'Payment processing status (separate from booking status)',
        position: 'sidebar',
      },
    },
    {
      name: 'transaction_id',
      type: 'text',
      label: 'Transaction ID',
      admin: {
        description: 'Payment gateway transaction ID',
        position: 'sidebar',
      },
    },
    {
      name: 'payment_timestamp',
      type: 'date',
      label: 'Payment Timestamp',
      admin: {
        description: 'Timestamp when payment was processed',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) {
          return data
        }

        // Validate status transitions
        if (operation === 'update' && originalDoc && data.status) {
          const currentStatus = originalDoc.status as string
          const newStatus = data.status as string

          // Define valid status transitions
          const validTransitions: Record<string, string[]> = {
            pending: ['paid', 'cancelled'],
            paid: ['confirmed', 'cancelled'],
            confirmed: ['completed', 'cancelled'],
            completed: [], // Completed bookings cannot be changed
            cancelled: [], // Cancelled bookings cannot be changed
          }

          // Check if transition is valid
          if (currentStatus !== newStatus) {
            const allowedStatuses = validTransitions[currentStatus] || []
            if (!allowedStatuses.includes(newStatus)) {
              throw new Error(
                `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`
              )
            }
          }
        }

        return data
      },
    ],
  },
  timestamps: true,
  versions: {
    drafts: false,
    maxPerDoc: 10,
  },
}

