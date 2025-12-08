# Image Storage Fix Summary

## Problem

Images were not displaying after deploying to Vercel because PayloadCMS was configured to use local file storage (`staticDir: 'media'`), which doesn't work on Vercel's ephemeral filesystem.

## Solution

Configured PayloadCMS to use Supabase Storage via the S3-compatible API adapter.

## Changes Made

### 1. Installed Dependencies
- Added `@payloadcms/storage-s3` package

### 2. Updated `payload.config.ts`
- Imported `s3Storage` from `@payloadcms/storage-s3`
- Added S3 configuration validation in `getEnv()` function
- Configured `s3Storage` plugin with Supabase Storage credentials
- Set `forcePathStyle: true` (required for Supabase Storage)

### 3. Updated `src/collections/Media.ts`
- Removed `staticDir: 'media'` (local storage)
- Files now use S3 storage adapter configured in `payload.config.ts`

### 4. Updated `next.config.ts`
- Added `images.remotePatterns` to allow images from Supabase Storage domains
- Configured patterns for both `*.supabase.co` and `*.storage.supabase.co`

### 5. Updated `.env.example`
- Added S3 storage configuration variables:
  - `S3_ENDPOINT`
  - `S3_REGION`
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_BUCKET`

### 6. Created Documentation
- `docs/supabase-storage-setup.md` - Complete setup guide

## Required Environment Variables

Add these to your `.env` file and Vercel environment variables:

```bash
S3_ENDPOINT=https://[project-ref].storage.supabase.co/storage/v1/s3
S3_REGION=us-east-1  # Your Supabase project region
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=media
```

## Next Steps

1. **Create Storage Bucket in Supabase**:
   - Go to Supabase Dashboard → Storage
   - Create a bucket named `media`
   - Make it public (or configure appropriate policies)

2. **Generate S3 Credentials**:
   - Go to Supabase Dashboard → Settings → Storage → S3 API
   - Generate new access keys
   - Copy the credentials

3. **Set Environment Variables**:
   - Add all S3 variables to your `.env` file
   - Add all S3 variables to Vercel Dashboard → Settings → Environment Variables
   - Redeploy your application

4. **Verify Setup**:
   - Upload a test image through PayloadCMS admin
   - Verify the image appears in Supabase Storage
   - Verify the image displays on your site

## Testing

1. Start your development server
2. Access PayloadCMS admin panel
3. Navigate to Media collection
4. Upload a test image
5. Verify the image is stored in Supabase Storage (check Supabase Dashboard)
6. Verify the image URL points to Supabase Storage
7. Deploy to Vercel and verify images still work

## Rollback

If you need to rollback:
1. Remove the `plugins` section from `payload.config.ts`
2. Restore `staticDir: 'media'` in `src/collections/Media.ts`
3. Remove S3 environment variables

**Note**: Rollback will cause images to fail on Vercel deployments.

