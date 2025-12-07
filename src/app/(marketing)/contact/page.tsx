import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { extractTextFromLexical } from '@/lib/lexical-renderer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Fetch Contact global with caching
 */
const getCachedContact = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return await payload.findGlobal({
      slug: 'contact',
    })
  },
  ['contact'],
  { revalidate: 3600, tags: ['contact'] }
)

/**
 * Generate metadata for Contact page
 */
export async function generateMetadata(): Promise<Metadata> {
  const contact = await getCachedContact()

  return {
    title: contact?.meta_title || contact?.page_title || 'Contact Us | Vestroo',
    description:
      contact?.meta_description ||
      extractTextFromLexical(contact?.content) ||
      'Get in touch with Vestroo',
  }
}

/**
 * Contact page - displays contact information and optional contact form
 */
export default async function ContactPage() {
  const contact = await getCachedContact()

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground">
            Contact information is being set up. Please check back soon.
          </p>
        </div>
      </div>
    )
  }

  const contactInfo = contact.contact_info || {}

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-64 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {contact.page_title || 'Contact Us'}
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          {contact.content && (
            <div className="prose prose-lg max-w-none mb-12 text-center">
              <div
                dangerouslySetInnerHTML={{
                  __html: extractTextFromLexical(contact.content),
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information Card */}
            <Card className="border-2 border-gray-200">
              <CardHeader className="bg-[#00A651] text-white rounded-t-lg">
                <CardTitle className="text-white">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {contactInfo.phone && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Phone</h3>
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="text-[#00A651] hover:underline text-lg"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                )}

                {contactInfo.email && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Email</h3>
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-[#00A651] hover:underline"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                )}

                {contactInfo.address && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Address</h3>
                    <p className="text-gray-600 whitespace-pre-line">
                      {contactInfo.address}
                    </p>
                  </div>
                )}

                {contactInfo.office_hours && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Office Hours</h3>
                    <p className="text-gray-600 whitespace-pre-line">
                      {contactInfo.office_hours}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Form (if enabled) */}
            {contact.contact_form_enabled && (
              <Card className="border-2 border-gray-200">
                <CardHeader className="bg-[#00A651] text-white rounded-t-lg">
                  <CardTitle className="text-white">Send us a Message</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-6">
                    Please fill out the below with questions or comments:
                  </p>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cell Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#00A651] to-[#008A43] hover:from-[#008A43] hover:to-[#00A651] text-white font-semibold py-3"
                    >
                      SUBMIT FEEDBACK
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

