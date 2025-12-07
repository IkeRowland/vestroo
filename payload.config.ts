import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { z } from 'zod'

import { Routes } from './src/collections/Routes'
import { Users } from './src/collections/Users'
import { VehicleTypes } from './src/collections/VehicleTypes'
import { PricingRules } from './src/collections/PricingRules'
import { Bookings } from './src/collections/Bookings'
import { Media } from './src/collections/Media'
import { Homepage } from './src/globals/Homepage'
import { AboutUs } from './src/globals/AboutUs'
import { Contact } from './src/globals/Contact'
import { SiteSettings } from './src/globals/SiteSettings'

// Environment variable validation
// Allow development fallback for PAYLOAD_SECRET, but require it in production
const isDevelopment = process.env.NODE_ENV !== 'production'

const getEnv = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URI
  let payloadSecret = process.env.PAYLOAD_SECRET

  // Validate DATABASE_URL (always required)
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required. Get the connection string from your Supabase project settings.'
    )
  }

  // Validate DATABASE_URL format
  try {
    new URL(databaseUrl)
  } catch {
    throw new Error(
      'DATABASE_URL must be a valid PostgreSQL connection string (URL format).'
    )
  }

  // Validate PAYLOAD_SECRET
  // PayloadCMS requires at least 16 characters, but 32+ is recommended for production
  const MIN_SECRET_LENGTH = 16
  const RECOMMENDED_SECRET_LENGTH = 32

  if (!payloadSecret) {
    if (isDevelopment) {
      // Use a development fallback
      payloadSecret = 'your-secret-key-change-in-production-min-16-chars'
      console.warn(
        '⚠️  PAYLOAD_SECRET not set. Using development fallback. Set PAYLOAD_SECRET in production!'
      )
    } else {
      throw new Error(
        `PAYLOAD_SECRET environment variable is required in production. It must be at least ${MIN_SECRET_LENGTH} characters long.`
      )
    }
  } else if (payloadSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `PAYLOAD_SECRET must be at least ${MIN_SECRET_LENGTH} characters long. Current length: ${payloadSecret.length}`
    )
  } else if (payloadSecret.length < RECOMMENDED_SECRET_LENGTH && !isDevelopment) {
    console.warn(
      `⚠️  PAYLOAD_SECRET is only ${payloadSecret.length} characters. For production, use at least ${RECOMMENDED_SECRET_LENGTH} characters for better security.`
    )
  }

  return {
    DATABASE_URL: databaseUrl,
    PAYLOAD_SECRET: payloadSecret,
  }
}

const env = getEnv()

export default buildConfig({
  admin: {
    user: 'users',
    // Admin routes are handled by Next.js route handler at /admin
    // No need to specify routes here as they're managed by the route handler
    // Suppress hydration warnings caused by dynamic CSS injection in PayloadCMS admin
    suppressHydrationWarning: true,
  },
  collections: [Users, Routes, VehicleTypes, PricingRules, Bookings, Media],
  globals: [Homepage, AboutUs, Contact, SiteSettings],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(__dirname, 'src/types/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
      // Connection options for better error handling
      connectionTimeoutMillis: 10000, // 10 second timeout
      idleTimeoutMillis: 30000, // 30 seconds
      max: 10, // Maximum pool size
    },
    // Migration options
    push: process.env.NODE_ENV !== 'production', // Enable auto-migration in development
    // Note: If you get "ENOTFOUND" errors, check:
    // 1. Is your Supabase project active? (Paused projects won't connect)
    // 2. Try using the connection pooling endpoint instead:
    //    Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    //    Or: postgresql://postgres.[project-ref]:[password]@[project-ref].pooler.supabase.com:6543/postgres
    // 3. Verify the connection string in Supabase Dashboard > Settings > Database
  }),
})

