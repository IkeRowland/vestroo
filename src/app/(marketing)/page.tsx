import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm'
import { HeroSlider } from '@/components/homepage/HeroSlider'
import { Check } from 'lucide-react'
import { getImageUrl } from '@/lib/image-url'
import { homepageContent } from '@/content/homepage'
import { ServicesOverview } from '@/components/marketing/ServicesOverview'
import { TrustStrip } from '@/components/marketing/TrustStrip'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'
import { getTripRequestPhoneCountryIso2FromHeaders } from '@/lib/trip-request-phone-country-hint.server'

export function generateMetadata(): Metadata {
  return buildMarketingMetadata(
    homepageContent.seo.meta_title,
    homepageContent.seo.meta_description,
    '/'
  )
}

/**
 * Homepage — static marketing content; layout matches Vestroo landing design.
 */
export default async function HomePage() {
  const homepage = homepageContent
  const tripRequestPhoneCountryIso2Hint = await getTripRequestPhoneCountryIso2FromHeaders()

  return (
    <div className="min-h-screen">
      {/* Hero Section with Slider and Booking Form */}
      <section className="relative min-h-[800px] md:min-h-[900px]">
        {homepage.hero_slider?.slides && homepage.hero_slider.slides.length > 0 ? (
          <div className="relative min-h-[800px] md:min-h-[900px]">
            <HeroSlider slides={homepage.hero_slider.slides} />
            {/* Booking Form Overlay */}
             <div className="absolute inset-0 pointer-events-none z-10 flex items-center">
               <div className="container mx-auto w-full">
                 <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
                   <div className="order-2 lg:order-1 pointer-events-auto lg:col-span-5">
                     <BookingSearchForm
                       variant="marketing"
                       tripRequestPhoneCountryIso2Hint={tripRequestPhoneCountryIso2Hint}
                     />
                   </div>
                   <div className="order-1 lg:order-2 lg:col-span-7" />
                 </div>
               </div>
             </div>
          </div>
        ) : (
           <div className="bg-gradient-to-b from-white to-gray-50 py-12 md:py-20">
             <div className="container mx-auto px-4">
               <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                 <div className="order-2 lg:order-1 lg:col-span-5">
                   <BookingSearchForm
                     variant="marketing"
                     tripRequestPhoneCountryIso2Hint={tripRequestPhoneCountryIso2Hint}
                   />
                 </div>
                 <div className="order-1 lg:order-2 lg:col-span-7">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Private driver transport across South Africa
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-700 mb-8">
                    Premium shuttle, corporate, VIP, tours, and discreet enquiries
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Great Journeys Section */}
      {homepage.great_journeys?.title && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  {homepage.great_journeys.title}
                </h2>
              </div>
              <div>
                {homepage.great_journeys.subtitle && (
                  <h3 className="text-xl md:text-2xl font-bold text-vest-rust mb-6 tracking-wide">
                    {homepage.great_journeys.subtitle}
                  </h3>
                )}
                <div className="text-lg text-gray-700 leading-relaxed space-y-4">
                  {homepage.great_journeys.description
                    .split(/\n\n+/)
                    .map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {homepage.services_overview?.title ? (
        <ServicesOverview section={homepage.services_overview} />
      ) : null}

      {homepage.trust_strip?.title ? (
        <TrustStrip
          eyebrow={homepage.trust_strip.eyebrow}
          title={homepage.trust_strip.title}
          description={homepage.trust_strip.description}
          link_label={homepage.trust_strip.link_label}
          link_href={homepage.trust_strip.link_href}
        />
      ) : null}

      {/* Ten Reasons Section */}
      {homepage.ten_reasons?.items && homepage.ten_reasons.items.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {homepage.ten_reasons.title || 'TEN GREAT REASONS TO CHOOSE US'}
              </h2>
              {homepage.ten_reasons.subtitle && (
                <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                  {homepage.ten_reasons.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
              {homepage.ten_reasons.items.map((item: { title: string; description?: string }, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Van Image */}
            {(homepage.ten_reasons.image_url ||
              homepage.ten_reasons.image_upload) && (
              <div className="mt-12">
                <div className="relative w-full rounded-lg overflow-hidden flex justify-center">
                  <Image
                    src={
                      getImageUrl(
                        homepage.ten_reasons.image_upload,
                        homepage.ten_reasons.image_url
                      ) || '/placeholder-van.jpg'
                    }
                    alt="Vestroo fleet — representative vehicle class"
                    width={1200}
                    height={900}
                    className="w-full h-auto"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Mission Statement Section */}
      {homepage.mission_statement?.quote && (
        <section className="py-20 bg-vest-section">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <blockquote className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-8 leading-snug tracking-tight uppercase">
                {homepage.mission_statement.quote}
              </blockquote>
              {homepage.mission_statement.author && (
                <div className="text-base text-gray-600">
                  <p className="font-medium tracking-wide">
                    {homepage.mission_statement.author}
                  </p>
                  {homepage.mission_statement.author_title && (
                    <p className="text-sm mt-1">
                      {homepage.mission_statement.author_title}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* App Download Section */}
      {homepage.app_download?.title && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: App Screenshot */}
              <div className="order-2 lg:order-1 flex items-center justify-center">
                {(homepage.app_download.app_screenshot_url ||
                  homepage.app_download.app_screenshot_upload) && (
                  <div className="relative w-full py-6 flex items-center justify-center">
                    <Image
                      src={
                        getImageUrl(
                          homepage.app_download.app_screenshot_upload,
                          homepage.app_download.app_screenshot_url
                        ) || '/placeholder-app.jpg'
                      }
                      alt="Vestroo app"
                      width={600}
                      height={800}
                      className="w-auto max-h-[400px] object-contain"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              {/* Right: App Info */}
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {homepage.app_download.title}
                </h2>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  {homepage.app_download.headline}
                </p>
                {homepage.app_download.description && (
                  <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                    {homepage.app_download.description}
                  </p>
                )}

                {/* App Store Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  {homepage.app_download.app_store_link && (
                    <Link
                      href={homepage.app_download.app_store_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Image
                        src="/app-store-badge.svg"
                        alt="Download on the App Store"
                        width={180}
                        height={60}
                        className="h-12 w-auto"
                      />
                    </Link>
                  )}
                  {homepage.app_download.google_play_link && (
                    <Link
                      href={homepage.app_download.google_play_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Image
                        src="/google-play-badge.svg"
                        alt="Get it on Google Play"
                        width={180}
                        height={60}
                        className="h-12 w-auto"
                      />
                    </Link>
                  )}
                </div>

                {/* QR Codes */}
                <div className="flex gap-4">
                  {homepage.app_download.qr_code_app_store_url && (
                    <div className="w-24 h-24 relative">
                      <Image
                        src={homepage.app_download.qr_code_app_store_url}
                        alt="App Store QR Code"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  {homepage.app_download.qr_code_google_play_url && (
                    <div className="w-24 h-24 relative">
                      <Image
                        src={homepage.app_download.qr_code_google_play_url}
                        alt="Google Play QR Code"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Partners Section */}
      {homepage.partners?.logos && homepage.partners.logos.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              {homepage.partners.title || 'OUR PARTNERS'}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {homepage.partners.logos.map((partner: { logo_upload?: unknown; logo_url?: string | null; name?: string; link?: string }, index: number) => {
                const logoUrl = getImageUrl(partner.logo_upload, partner.logo_url)
                if (!logoUrl) return null

                const content = (
                  <div
                    key={index}
                    className="flex items-center justify-center h-16 w-auto grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
                  >
                    <Image
                      src={logoUrl}
                      alt={partner.name || `Partner ${index + 1}`}
                      width={120}
                      height={60}
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                )

                return partner.link ? (
                  <Link
                    key={index}
                    href={partner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {homepage.testimonials?.items && homepage.testimonials.items.length > 0 && (
        <section className="py-16 bg-vest-section">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              {homepage.testimonials.subtitle ? (
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                  {homepage.testimonials.subtitle}
                </p>
              ) : null}
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {homepage.testimonials.title || 'WHAT OUR CLIENTS SAY'}
              </h2>
              {homepage.testimonials.description ? (
                <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                  {homepage.testimonials.description}
                </p>
              ) : null}
            </div>

            <div className="max-w-xl mx-auto">
              {homepage.testimonials.items.map((testimonial: { quote: string; rating?: number; customer_name: string; photo_upload?: unknown; photo_url?: string | null }, index: number) => {
                const photoUrl = getImageUrl(
                  testimonial.photo_upload,
                  testimonial.photo_url
                )

                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-8 shadow-md border border-gray-100"
                  >
                    <div className="flex items-center gap-0.5 mb-4 justify-center md:justify-start">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <span
                          key={i}
                          className="text-amber-500 text-xl leading-none"
                          aria-hidden
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 leading-relaxed text-center md:text-left">
                      &quot;{testimonial.quote}&quot;
                    </blockquote>
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      {photoUrl ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                          <Image
                            src={photoUrl}
                            alt={testimonial.customer_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {testimonial.customer_name}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section (if exists) */}
      {homepage.cta_section?.title && (
        <section className="py-16 bg-vest-rust text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {homepage.cta_section.title}
            </h2>
            {homepage.cta_section.description && (
              <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                {homepage.cta_section.description}
              </p>
            )}
            <Link
              href={homepage.cta_section.button_link || '/book/search'}
              className="inline-flex items-center justify-center rounded-sm bg-white px-10 py-3.5 text-base font-semibold text-vest-rust shadow-sm transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {homepage.cta_section.button_text || 'Get a Quote'}
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
