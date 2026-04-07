import Link from 'next/link'
import { servicesList } from '@/content/services'

type ServicesOverviewProps = {
  section: {
    title: string
    subtitle?: string
    hub_cta_label: string
    hub_href: string
  }
}

export function ServicesOverview({ section }: ServicesOverviewProps) {
  if (!section?.title) return null

  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {section.title}
          </h2>
          {section.subtitle ? (
            <p className="text-lg text-gray-700">{section.subtitle}</p>
          ) : null}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {servicesList.map((svc) => (
            <Link
              key={svc.slug}
              href={`/services/${svc.slug}`}
              className="group block rounded-lg border border-gray-200 bg-vest-section p-6 shadow-sm transition hover:border-vest-rust hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vest-rust"
            >
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-vest-rust mb-2">
                {svc.short_title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-3">{svc.promise}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-vest-rust">
                Learn more →
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href={section.hub_href}
            className="inline-flex items-center justify-center rounded-sm bg-vest-rust px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-vest-rust-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vest-rust"
          >
            {section.hub_cta_label}
          </Link>
        </div>
      </div>
    </section>
  )
}
