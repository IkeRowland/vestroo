import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm'
import { HeroSlider } from '@/components/homepage/HeroSlider'
import { Check } from 'lucide-react'

/**
 * Fetch homepage global with caching
 */
const getCachedHomepage = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return await payload.findGlobal({
      slug: 'homepage',
    })
  },
  ['homepage'],
  { revalidate: 3600, tags: ['homepage'] }
)

/**
 * Generate metadata for homepage
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const homepage = await getCachedHomepage()

    return {
      title: homepage?.seo?.meta_title || 'Vestroo - Premium Shuttle Service',
      description:
        homepage?.seo?.meta_description ||
        'Book your premium shuttle service with Vestroo',
    }
  } catch {
    return {
      title: 'Vestroo - Premium Shuttle Service',
      description: 'Book your premium shuttle service with Vestroo',
    }
  }
}

/**
 * Helper to get image URL from upload or URL field
 */
function getImageUrl(
  upload: any,
  url?: string | null
): string | null {
  if (url) return url
  if (upload) {
    if (typeof upload === 'object' && upload?.url) return upload.url
    if (typeof upload === 'string') return upload
  }
  return null
}

/**
 * Homepage - Content managed in PayloadCMS, layout hard-coded for full design control
 */
export default async function HomePage() {
  let homepage

  try {
    homepage = await getCachedHomepage()
  } catch (error) {
    console.error('Error fetching homepage:', error)
    homepage = null
  }

  if (!homepage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Vestroo</h1>
          <p className="text-gray-600 mb-4">
            Homepage content is being set up. Please add content in PayloadCMS
            admin.
          </p>
          <Link
            href="/admin/globals/homepage"
            className="text-primary hover:underline"
          >
            Go to Admin Panel
          </Link>
        </div>
      </div>
    )
  }

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
                     <BookingSearchForm />
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
                   <BookingSearchForm />
                 </div>
                 <div className="order-1 lg:order-2 lg:col-span-7">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Welcome to Vestroo
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-700 mb-8">
                    Your premium shuttle booking service
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
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                    {homepage.great_journeys.subtitle}
                  </h3>
                )}
                <p className="text-lg text-gray-700 leading-relaxed">
                  {homepage.great_journeys.description}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ten Reasons Section */}
      {homepage.ten_reasons?.items && homepage.ten_reasons.items.length > 0 && (
        <section className="py-16 bg-gray-50">
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
              {homepage.ten_reasons.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#25A89B]">
                      <Check className="w-4 h-4 text-[#25A89B]" strokeWidth={2.5} />
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
                    alt="Our fleet"
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
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-6xl md:text-8xl text-blue-200 mb-6">"</div>
              <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-8 leading-relaxed">
                {homepage.mission_statement.quote}
              </blockquote>
              {homepage.mission_statement.author && (
                <div className="text-lg text-gray-700">
                  <p className="font-semibold">{homepage.mission_statement.author}</p>
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
        <section className="py-16 bg-gray-50">
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
                      alt="EZ Shuttle App"
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
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
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
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
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
              {homepage.partners.logos.map((partner: any, index: number) => {
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
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                {homepage.testimonials.subtitle || 'TESTIMONIALS'}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {homepage.testimonials.title || 'WHAT OUR CLIENTS SAY'}
              </h2>
              {homepage.testimonials.description && (
                <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                  {homepage.testimonials.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {homepage.testimonials.items.map((testimonial: any, index: number) => {
                const photoUrl = getImageUrl(
                  testimonial.photo_upload,
                  testimonial.photo_url
                )

                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <span key={i} className="text-yellow-400 text-lg">
                          ★
                        </span>
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                      {photoUrl && (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={photoUrl}
                            alt={testimonial.customer_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
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
        <section className="py-16 bg-[#bc4328] text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {homepage.cta_section.title}
            </h2>
            {homepage.cta_section.description && (
              <p className="text-xl mb-8 opacity-90">
                {homepage.cta_section.description}
              </p>
            )}
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6"
            >
              <Link href={homepage.cta_section.button_link || '/book/search'}>
                {homepage.cta_section.button_text || 'Book Now'}
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
