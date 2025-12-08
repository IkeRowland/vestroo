import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
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

  // Validate S3 storage credentials for Supabase Storage
  // Get credentials from Supabase Dashboard > Settings > Storage > S3 API
  // Endpoint format: https://[project-ref].storage.supabase.co/storage/v1/s3
  const s3Config = {
    endpoint: process.env.S3_ENDPOINT || process.env.SUPABASE_STORAGE_S3_ENDPOINT,
    region: process.env.S3_REGION || process.env.SUPABASE_STORAGE_S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.SUPABASE_STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY,
    },
    bucket: process.env.S3_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'media',
    forcePathStyle: true, // Required for Supabase Storage
  }

  // Validate S3 config (optional in development, required in production)
  if (!isDevelopment && (!s3Config.endpoint || !s3Config.credentials.accessKeyId || !s3Config.credentials.secretAccessKey)) {
    console.warn(
      '⚠️  S3 storage credentials not fully configured. Media uploads may not work in production. Configure S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.'
    )
  }

  return {
    DATABASE_URL: databaseUrl,
    PAYLOAD_SECRET: payloadSecret,
    S3_CONFIG: s3Config,
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
  plugins: [
    s3Storage({
      collections: {
        media: {
          bucket: env.S3_CONFIG.bucket,
          prefix: 'media', // Optional: prefix for files in the bucket
        },
      },
      options: {
        endpoint: env.S3_CONFIG.endpoint,
        region: env.S3_CONFIG.region,
        credentials: env.S3_CONFIG.credentials.accessKeyId && env.S3_CONFIG.credentials.secretAccessKey
          ? {
              accessKeyId: env.S3_CONFIG.credentials.accessKeyId,
              secretAccessKey: env.S3_CONFIG.credentials.secretAccessKey,
            }
          : undefined,
        forcePathStyle: env.S3_CONFIG.forcePathStyle,
      },
    }),
  ],
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

