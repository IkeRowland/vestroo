import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  access: {
    read: ({ req: { user } }) => {
      // Users can read their own data, admins can read anyone
      if (user) {
        if (user.role === 'admin') {
          return true
        }
        return {
          id: {
            equals: user.id,
          },
        }
      }
      return false
    },
    create: () => true, // Allow user registration (first admin user creation)
    update: ({ req: { user } }) => {
      // Users can update their own data, admins can update anyone
      if (user) {
        if (user.role === 'admin') {
          return true
        }
        return {
          id: {
            equals: user.id,
          },
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete users
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'user',
      options: [
        {
          label: 'User',
          value: 'user',
        },
        {
          label: 'Admin',
          value: 'admin',
        },
      ],
      admin: {
        description: 'User role. Admin users have access to all collections.',
      },
    },
  ],
}

