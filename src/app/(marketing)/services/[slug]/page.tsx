import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServiceBySlug, servicesList } from '@/content/services'
import { MarketingPageHero } from '@/components/marketing/MarketingPageHero'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return servicesList.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const svc = getServiceBySlug(slug)
  if (!svc) return { title: 'Not found' }

  return buildMarketingMetadata(
    svc.meta_title,
    svc.meta_description,
    `/services/${svc.slug}`
  )
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params
  const svc = getServiceBySlug(slug)
  if (!svc) notFound()

  return (
    <div className="min-h-screen bg-white">
      <MarketingPageHero title={svc.hero_title} subtitle={svc.audience} />
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <p className="text-lg text-gray-800 font-medium mb-8">{svc.promise}</p>
          <div
            className="prose prose-lg max-w-none text-gray-700 mb-10"
            dangerouslySetInnerHTML={{ __html: svc.body_html }}
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={svc.primary_cta.href}
              className="inline-flex justify-center rounded-sm bg-vest-rust px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-vest-rust-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vest-rust"
            >
              {svc.primary_cta.label}
            </Link>
            {svc.secondary_cta ? (
              <Link
                href={svc.secondary_cta.href}
                className="inline-flex justify-center rounded-sm border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vest-rust"
              >
                {svc.secondary_cta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
