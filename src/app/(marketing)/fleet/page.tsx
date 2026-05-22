import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { fleetContent } from '@/content/fleet'
import { marketingHeroVideoSrc } from '@/content/marketing-chrome'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

export function generateMetadata(): Metadata {
  return buildMarketingMetadata(
    fleetContent.meta_title,
    fleetContent.meta_description,
    '/fleet'
  )
}

export default function FleetPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingPageHero
        title={fleetContent.page_title}
        subtitle="Vehicle classes for private driver transport—not public transit categories."
        backgroundVideoSrc={marketingHeroVideoSrc}
      />
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div
            className="prose prose-lg max-w-3xl mx-auto text-gray-700 mb-12 text-center"
            dangerouslySetInnerHTML={{ __html: fleetContent.intro_html }}
          />
          <div className="grid md:grid-cols-2 gap-10">
            {fleetContent.classes.map((v) => (
              <article
                key={v.id}
                className="rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white"
              >
                <div className="relative aspect-[16/10] w-full bg-gray-100">
                  <Image
                    src={v.image_url}
                    alt={`${v.name} — representative vehicle class`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {v.name}
                  </h2>
                  <p className="text-gray-700 mb-2">{v.summary}</p>
                  <p className="text-sm text-gray-500">{v.capacity_hint}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="text-center mt-12 text-gray-600">
            Ready to book?{' '}
            <Link
              href="/book/search"
              className="font-semibold text-vest-rust hover:underline"
            >
              Start a quote
            </Link>{' '}
            or{' '}
            <Link
              href="/contact"
              className="font-semibold text-vest-rust hover:underline"
            >
              contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
