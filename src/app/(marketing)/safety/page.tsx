import type { Metadata } from 'next'
import Link from 'next/link'
import { safetyContent } from '@/content/safety'
import { marketingHeroVideoSrc } from '@/content/marketing-chrome'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

export function generateMetadata(): Metadata {
  return buildMarketingMetadata(
    safetyContent.meta_title,
    safetyContent.meta_description,
    '/safety'
  )
}

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingPageHero
        title={safetyContent.page_title}
        subtitle="High-level commitment to safety and regulatory awareness—detail on request."
        backgroundVideoSrc={marketingHeroVideoSrc}
      />
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div
            className="prose prose-lg max-w-none text-gray-700 mb-12"
            dangerouslySetInnerHTML={{ __html: safetyContent.intro_html }}
          />
          <div className="space-y-10">
            {safetyContent.sections.map((block) => (
              <article key={block.title}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {block.title}
                </h2>
                <div
                  className="prose prose-lg max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: block.body_html }}
                />
              </article>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href={safetyContent.cta.href}
              className="inline-flex justify-center rounded-sm bg-vest-rust px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-vest-rust-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vest-rust"
            >
              {safetyContent.cta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
