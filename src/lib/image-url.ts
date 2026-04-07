/**
 * Utility functions for handling image URLs from PayloadCMS media
 * Handles conversion from PayloadCMS API routes to Supabase Storage URLs
 */

/**
 * Convert image URL to Supabase Storage URL if needed
 * Handles:
 * - Relative paths from PayloadCMS API routes (/api/media/file/...)
 * - Old local storage paths (media/...)
 * - Full URLs (already correct - including Supabase Storage URLs)
 * - Supabase Storage URLs that need bucket path correction
 */
export function convertToSupabaseUrl(url: string): string {
  if (!url) return url

  // If it's already a full URL (http/https), check if it's a Supabase Storage URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If it's already a Supabase Storage URL, return as-is
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
      return url
    }
    // Other external URLs (e.g., CDN, other domains) - return as-is
    return url
  }

  // Next.js `public/images/*` — do not rewrite to Supabase storage
  if (url.startsWith('/images/')) {
    return url
  }

  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    // Fallback to PayloadCMS API route if Supabase URL not configured
    if (url.startsWith('/')) {
      return url
    }
    return `/api/media/file/${url}`
  }

  // Extract project reference from Supabase URL
  // Format: https://[project-ref].supabase.co
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  const projectRef = urlMatch ? urlMatch[1] : null

  if (!projectRef) {
    // Fallback if we can't extract project reference
    return url.startsWith('/') ? url : `/api/media/file/${url}`
  }

  // Remove leading slashes and 'media/' prefix if present
  let cleanPath = url.replace(/^\/+/, '').replace(/^media\//, '')

  // Remove '/api/media/file/' prefix if present (PayloadCMS API route)
  cleanPath = cleanPath.replace(/^api\/media\/file\//, '')

  // Construct Supabase Storage public URL
  // Format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
  const bucket = process.env.S3_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'media'
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
}

/**
 * Get image URL from PayloadCMS upload object or explicit URL field
 * Handles both local storage paths and S3/Supabase Storage URLs
 */
export function getImageUrl(
  upload: unknown,
  url?: string | null
): string | null {
  // If explicit URL is provided, use it
  if (url) {
    return convertToSupabaseUrl(url)
  }

  // If upload object is provided, extract URL
  if (upload) {
    if (typeof upload === 'object' && upload !== null && 'url' in upload) {
      const uploadObj = upload as { url: string }
      return convertToSupabaseUrl(uploadObj.url)
    }
    if (typeof upload === 'string') {
      return convertToSupabaseUrl(upload)
    }
  }

  return null
}

