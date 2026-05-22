import type { Metadata } from 'next'
import { aboutUsContent } from '@/content/about-us'
import { marketingHeroVideoSrc } from '@/content/marketing-chrome'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

export function generateMetadata(): Metadata {
  return buildMarketingMetadata(
    aboutUsContent.meta_title,
    aboutUsContent.meta_description,
    '/about'
  )
}

export default function AboutUsPage() {
  const aboutUs = aboutUsContent

  return (
    <div className="min-h-screen bg-white">
      <MarketingPageHero
        title={aboutUs.page_title}
        backgroundVideoSrc={marketingHeroVideoSrc}
      />

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div
            className="prose prose-lg max-w-none mb-12 text-gray-700"
            dangerouslySetInnerHTML={{ __html: aboutUs.content_html }}
          />

          {aboutUs.stats && aboutUs.stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {aboutUs.stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-6 rounded-lg border-2 border-gray-200 bg-white hover:border-[#bc4328] transition-colors"
                >
                  <div className="text-4xl font-bold text-[#bc4328] mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {aboutUs.team_section_html && (
            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Our Team</h2>
              <div
                className="text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: aboutUs.team_section_html,
                }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
