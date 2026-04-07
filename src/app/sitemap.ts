import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { listActiveExperiencePackages } from '@/lib/experience-package-data'

const MARKETING_PATHS = [
  '/',
  '/about',
  '/contact',
  '/fleet',
  '/safety',
  '/services',
  '/services/premium-shuttle',
  '/services/corporate',
  '/services/vip',
  '/services/tours',
  '/services/close-protection',
  '/tours',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = MARKETING_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? ('daily' as const) : ('weekly' as const),
    priority: path === '/' ? 1 : 0.8,
  }))

  try {
    const pkgs = await listActiveExperiencePackages()
    const tourEntries: MetadataRoute.Sitemap = pkgs.map((p) => ({
      url: `${base}/tours/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }))
    return [...staticEntries, ...tourEntries]
  } catch {
    return staticEntries
  }
}
