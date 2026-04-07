import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { contactContent } from '@/content/contact'
import { ContactEnquiryForm } from '@/components/marketing/ContactEnquiryForm'
import { buildMarketingMetadata } from '@/lib/marketing-metadata'

export function generateMetadata(): Metadata {
  return buildMarketingMetadata(
    contactContent.meta_title,
    contactContent.meta_description,
    '/contact'
  )
}

export default function ContactPage() {
  const contact = contactContent
  const contactInfo = contact.contact_info || {}

  return (
    <div className="min-h-screen">
      <section className="relative h-64 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {contact.page_title}
          </h1>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div
            className="prose prose-lg max-w-none mb-12 text-center text-gray-700"
            dangerouslySetInnerHTML={{ __html: contact.content_html }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-2 border-gray-200">
              <CardHeader className="bg-[#bc4328] text-white rounded-t-lg">
                <CardTitle className="text-white">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {contactInfo.phone && (
                  <div>
                    <h3 className="font-semibold mb-2 text-gray-900">Phone</h3>
                    <a
                      href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                      className="text-[#bc4328] hover:underline text-lg"
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
                      className="text-[#bc4328] hover:underline"
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
                    <h3 className="font-semibold mb-2 text-gray-900">
                      Office Hours
                    </h3>
                    <p className="text-gray-600 whitespace-pre-line">
                      {contactInfo.office_hours}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {contact.contact_form_enabled && (
              <Card className="border-2 border-gray-200">
                <CardHeader className="bg-[#bc4328] text-white rounded-t-lg">
                  <CardTitle className="text-white">Send us a Message</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-6">
                    Share your enquiry below. We respond during office hours listed
                    on this page.
                  </p>
                  <ContactEnquiryForm />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
