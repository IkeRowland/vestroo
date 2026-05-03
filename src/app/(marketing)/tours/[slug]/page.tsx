import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  fetchExperiencePackageBySlug,
  normalizeItinerarySteps,
} from '@/lib/experience-package-data'
import { parseAddonCatalog } from '@/lib/experience-package-quote'
import { ExperienceTourBookingShell } from '@/features/booking/components/ExperienceTourBookingShell'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

type PageProps = { params: Promise<{ slug: string }> }

/** Avoid build-time Supabase fetch when generating static paths. */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const pkg = await fetchExperiencePackageBySlug(slug)
  if (!pkg) {
    return { title: 'Not found' }
  }
  return buildMarketingMetadata(
    pkg.title,
    pkg.description ?? `${pkg.title} — Vestroo experience package`,
    `/tours/${pkg.slug}`
  )
}

export default async function TourDetailPage({ params }: PageProps) {
  const { slug } = await params
  const pkg = await fetchExperiencePackageBySlug(slug)
  if (!pkg) {
    notFound()
  }

  const steps = normalizeItinerarySteps(pkg.itinerary)
  const addons = parseAddonCatalog(pkg.addon_catalog)

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <Link
            href="/tours"
            className="text-sm font-medium text-vest-rust hover:underline"
          >
            ← All tours &amp; experiences
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {pkg.title}
          </h1>
          {pkg.description ? (
            <p className="mt-4 text-lg text-gray-700 max-w-3xl">{pkg.description}</p>
          ) : null}
          <p className="mt-4 text-base font-semibold text-gray-900">
            From R {pkg.base_price_zar.toFixed(2)}{' '}
            <span className="font-normal text-gray-600 text-sm">
              (base for up to {pkg.included_passengers} guests; extra guests priced per package
              rules)
            </span>
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Itinerary</h2>
            {steps.length === 0 ? (
              <p className="text-gray-600 text-sm">Itinerary details coming soon.</p>
            ) : (
              <ol className="space-y-4">
                {steps.map((s) => (
                  <li
                    key={`${s.order}-${s.title}`}
                    className="flex gap-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vest-rust text-xs font-bold text-white">
                      {s.order}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{s.title}</p>
                      {s.location_label ? (
                        <p className="text-sm text-gray-600 mt-1">{s.location_label}</p>
                      ) : null}
                      {typeof s.duration_minutes === 'number' ? (
                        <p className="text-xs text-gray-500 mt-1">
                          ~{s.duration_minutes} min
                        </p>
                      ) : null}
                      {s.highlight ? (
                        <p className="text-sm text-gray-700 mt-2">{s.highlight}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <ExperienceTourBookingShell
            packageId={pkg.id}
            packageSlug={pkg.slug}
            packageTitle={pkg.title}
            addons={addons}
          />
        </div>
      </div>
    </div>
  )
}
