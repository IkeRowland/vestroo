import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import Image from 'next/image'
import { getImageUrl } from '@/lib/image-url'

/**
 * Fetch site settings with caching
 */
const getCachedSiteSettings = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return await payload.findGlobal({
      slug: 'site-settings',
    })
  },
  ['site-settings'],
  { revalidate: 3600, tags: ['site-settings'] }
)

/**
 * Top bar with contact information
 */
async function TopBar() {
  const siteSettings = await getCachedSiteSettings()
  const topBar = siteSettings?.top_bar

  if (!topBar) {
    return null
  }

  return (
    <div className="bg-[#bc4328] text-white py-2 px-4">
      <div className="container mx-auto max-w-7xl flex flex-wrap items-center justify-between text-sm">
        <div className="font-semibold">{topBar.company_name || 'VESTROO SHUTTLE SERVICES'}</div>
        <div className="flex flex-wrap items-center gap-4">
          {topBar.phone_numbers?.map((phone: { number?: string }, index: number) => (
            <a
              key={index}
              href={`tel:${phone.number?.replace(/\s/g, '')}`}
              className="hover:underline"
            >
              {phone.number}
            </a>
          ))}
          {topBar.email && (
            <a href={`mailto:${topBar.email}`} className="hover:underline">
              {topBar.email.toUpperCase()}
            </a>
          )}
          {topBar.client_login_text && (
            <Link href={topBar.client_login_url || '/admin'} className="hover:underline">
              {topBar.client_login_text}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Main navigation bar
 */
async function MainNav() {
  const siteSettings = await getCachedSiteSettings()
  const header = siteSettings?.header

  if (!header) {
    return null
  }

  const logoUrl = getImageUrl(header.logo_image_upload, header.logo_image_url)

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            {header.logo_type === 'image' && logoUrl ? (
              <div className="w-[120px] h-[120px] relative">
                <Image
                  src={logoUrl}
                  alt={header.company_name || 'Logo'}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <div className="w-24 h-24 bg-[#bc4328] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {header.logo_text || 'V'}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {header.company_name || 'Vestroo'}
                  </div>
                  {header.tagline && (
                    <div className="text-xs text-gray-600">{header.tagline}</div>
                  )}
                </div>
              </>
            )}
          </Link>

          {/* Navigation Links */}
          {header.navigation_links && header.navigation_links.length > 0 && (
            <div className="hidden md:flex items-center gap-8">
              {header.navigation_links.map((link: { url?: string; label: string }, index: number) => (
                <Link
                  key={index}
                  href={link.url || '#'}
                  className="text-gray-900 hover:text-[#bc4328] font-medium transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="md:hidden"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        </div>
      </div>
    </nav>
  )
}

/**
 * Header component - combines top bar and main navigation
 * Fetches data from PayloadCMS SiteSettings global
 */
export async function Header() {
  return (
    <header>
      <TopBar />
      <MainNav />
    </header>
  )
}

