# Testimonial Image Fix - Vercel Deployment

## Issue
Testimonial images (and other media) were not showing in Vercel deployment, but worked correctly in local development.

## Root Cause
When PayloadCMS stores media files with S3 storage (Supabase Storage), the URLs stored in the database can be in different formats:
- Relative paths like `/api/media/file/filename.jpg` (PayloadCMS API route)
- Old local storage paths like `media/filename.jpg`
- Just filenames
- Sometimes full Supabase Storage URLs

In local development, PayloadCMS might serve files through its API routes, but in production with S3 storage, files need to be served directly from Supabase Storage using the public URL format.

## Solution
Created a shared utility function `getImageUrl` in `src/lib/image-url.ts` that:
1. Detects the URL format
2. Converts relative paths and filenames to full Supabase Storage URLs
3. Handles full URLs (already correct) by returning them as-is

### URL Conversion Logic
The `convertToSupabaseUrl` function:
- Returns full URLs (http/https) as-is if they're already Supabase Storage URLs or external URLs
- Converts relative paths to Supabase Storage URLs:
  - Format: `https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]`
  - Extracts project reference from `NEXT_PUBLIC_SUPABASE_URL`
  - Uses bucket name from `S3_BUCKET` or `SUPABASE_STORAGE_BUCKET` env var (defaults to `media`)
  - Removes prefixes like `media/`, `/api/media/file/` from paths

### Updated Components
All components using image URLs now use the shared utility:
- `src/app/(marketing)/page.tsx` - Homepage (testimonials, hero, partners, etc.)
- `src/components/layout/Header.tsx` - Header logo
- `src/components/layout/Footer.tsx` - Footer logo

## Files Changed
1. **Created:** `src/lib/image-url.ts` - Shared utility for image URL conversion
2. **Updated:** `src/app/(marketing)/page.tsx` - Use shared `getImageUrl` utility
3. **Updated:** `src/components/layout/Header.tsx` - Use shared `getImageUrl` utility
4. **Updated:** `src/components/layout/Footer.tsx` - Use shared `getImageUrl` utility

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `S3_BUCKET` or `SUPABASE_STORAGE_BUCKET` - Storage bucket name (defaults to `media`)

## Testing
- Build passes successfully
- All image URLs are converted to Supabase Storage URLs in production
- Works with both old and new media file formats

## Deployment Notes
After deploying to Vercel:
1. Ensure environment variables are set correctly in Vercel dashboard
2. Old media files with relative paths will be automatically converted to Supabase Storage URLs
3. New uploads should work correctly with the S3 storage adapter

