import type { Metadata } from 'next'
import Link from 'next/link'
import { servicesList } from '@/content/services'
import { marketingHeroVideoSrc } from '@/content/marketing-chrome'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

export function generateMetadata(): Metadata {
  return buildMarketingMetadata(
    'Services',
    'Premium shuttle, corporate transport, VIP transfers, and curated tours — South Africa.',
    '/services'
  )
}

export default function ServicesHubPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingPageHero
        title="Our services"
        subtitle="Premium passenger transport tailored to your corridor, programme, and duty of care."
        backgroundVideoSrc={marketingHeroVideoSrc}
      />
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl mx-auto">
            Explore each line to see who it is for, what we deliver, and how to
            take the next step—every page links to booking or contact.
          </p>
          <ul className="space-y-6">
            {servicesList.map((svc) => (
              <li
                key={svc.slug}
                className="rounded-lg border border-gray-200 p-6 shadow-sm hover:border-vest-rust transition-colors"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  <Link
                    href={`/services/${svc.slug}`}
                    className="hover:text-vest-rust focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vest-rust"
                  >
                    {svc.hero_title}
                  </Link>
                </h2>
                <p className="text-sm font-medium text-vest-rust mb-2">
                  {svc.audience}
                </p>
                <p className="text-gray-700 mb-4">{svc.promise}</p>
                <Link
                  href={`/services/${svc.slug}`}
                  className="text-sm font-semibold text-vest-rust hover:underline"
                >
                  View details →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
