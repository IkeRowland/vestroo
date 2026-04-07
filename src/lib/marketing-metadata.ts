import type { Metadata } from 'next'
import { absoluteUrl } from '@/lib/site-url'

/**
 * Consistent SEO metadata for public marketing routes (title, description, canonical, Open Graph).
 */
export function buildMarketingMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  const url = absoluteUrl(path)

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Vestroo',
      locale: 'en_ZA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
