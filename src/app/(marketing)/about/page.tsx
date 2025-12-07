import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { extractTextFromLexical } from '@/lib/lexical-renderer'

/**
 * Fetch About Us global with caching
 */
const getCachedAboutUs = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return await payload.findGlobal({
      slug: 'about-us',
    })
  },
  ['about-us'],
  { revalidate: 3600, tags: ['about-us'] }
)

/**
 * Generate metadata for About Us page
 */
export async function generateMetadata(): Promise<Metadata> {
  const aboutUs = await getCachedAboutUs()

  return {
    title: aboutUs?.meta_title || aboutUs?.page_title || 'About Us | Vestroo',
    description:
      aboutUs?.meta_description ||
      extractTextFromLexical(aboutUs?.content) ||
      'Learn more about Vestroo',
  }
}

/**
 * About Us page - EZ Shuttle style with hero section
 */
export default async function AboutUsPage() {
  const aboutUs = await getCachedAboutUs()

  if (!aboutUs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">About Us</h1>
          <p className="text-gray-600">
            About Us content is being set up. Please check back soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-64 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {aboutUs.page_title || 'About Us'}
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          {aboutUs.content && (
            <div className="prose prose-lg max-w-none mb-12">
              <div
                dangerouslySetInnerHTML={{
                  __html: extractTextFromLexical(aboutUs.content),
                }}
              />
            </div>
          )}

          {/* Statistics */}
          {aboutUs.stats && aboutUs.stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {aboutUs.stats.map(
                (
                  stat: { label?: string; value?: string; id?: string },
                  index: number
                ) => (
                  <div
                    key={stat.id || index}
                    className="text-center p-6 rounded-lg border-2 border-gray-200 bg-white hover:border-[#00A651] transition-colors"
                  >
                    <div className="text-4xl font-bold text-[#00A651] mb-2">
                      {stat.value || '0'}
                    </div>
                    <div className="text-gray-600 font-medium">
                      {stat.label || ''}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Team Section */}
          {aboutUs.team_section && (
            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Our Team</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: extractTextFromLexical(aboutUs.team_section),
                }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

