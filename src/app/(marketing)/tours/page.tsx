import Link from 'next/link'
import { listActiveExperiencePackages } from '@/lib/experience-package-data'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

/** Avoid build-time Supabase fetch (CI / no DB); pages render on request. */
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return buildMarketingMetadata(
    'Curated tours & experience packages',
    'Book private chauffeured experiences in South Africa — clear pricing, structured itineraries, and premium vehicles.',
    '/tours'
  )
}

export default async function ToursListingPage() {
  const packages = await listActiveExperiencePackages()

  return (
    <div className="min-h-screen bg-white">
      <MarketingPageHero
        title="Tours &amp; experiences"
        subtitle="Curated day packages with structured itineraries — book online with the same trusted checkout as point-to-point trips."
      />
      <section className="py-14 px-4">
        <div className="container mx-auto max-w-3xl">
          {packages.length === 0 ? (
            <p className="text-gray-700">
              Experience packages will appear here after the VST-10 migration is applied to your
              Supabase project and seed data is loaded. See{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">docs/tours-and-experiences.md</code>{' '}
              in the repository for setup.
            </p>
          ) : (
            <ul className="space-y-6">
              {packages.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/80 p-6 shadow-sm"
                >
                  <Link
                    href={`/tours/${p.slug}`}
                    className="text-xl font-semibold text-gray-900 hover:text-vest-rust"
                  >
                    {p.title}
                  </Link>
                  {p.description ? (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-3">{p.description}</p>
                  ) : null}
                  <p className="mt-3 text-sm font-medium text-gray-800">
                    From R {p.base_price_zar.toFixed(2)}{' '}
                    <span className="font-normal text-gray-500">(package base)</span>
                  </p>
                  <Link
                    href={`/tours/${p.slug}`}
                    className="mt-4 inline-flex text-sm font-semibold text-vest-rust hover:underline"
                  >
                    View itinerary &amp; book
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
