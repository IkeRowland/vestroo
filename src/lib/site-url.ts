/**
 * Canonical site origin for metadata, sitemap, and Open Graph.
 * Set NEXT_PUBLIC_APP_URL in each environment (see docs/environment-vars.md).
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  )
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
