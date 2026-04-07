import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { getImageUrl } from '@/lib/image-url'
import { siteSettings } from '@/content/site-settings'
import { VestrooMark } from '@/components/brand/VestrooMark'

function TopBar() {
  const topBar = siteSettings.top_bar

  return (
    <div className="bg-vest-rust text-white py-2 px-4">
      <div className="container mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold tracking-wide">
          {topBar.brand_left}
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {topBar.phone_numbers?.map(
            (phone: { number?: string }, index: number) => (
              <a
                key={index}
                href={`tel:${phone.number?.replace(/\s/g, '')}`}
                className="hover:underline"
              >
                {phone.number}
              </a>
            )
          )}
          {topBar.email && (
            <a href={`mailto:${topBar.email}`} className="hover:underline">
              {topBar.email}
            </a>
          )}
          {topBar.client_login_text && (
            <Link
              href={topBar.client_login_url || '/book/search'}
              className="hover:underline font-medium"
            >
              {topBar.client_login_text}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function MainNav() {
  const header = siteSettings.header
  const logoUrl = getImageUrl(header.logo_image_upload, header.logo_image_url)

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-[5.25rem]">
          <Link href="/" className="flex items-center gap-3">
            {header.logo_type === 'image' && logoUrl ? (
              <div className="w-[100px] h-[100px] relative">
                <Image
                  src={logoUrl}
                  alt={header.company_name || 'Logo'}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <VestrooMark className="shrink-0" />
                <div>
                  <div className="text-xl font-bold text-vest-charcoal tracking-tight">
                    {header.company_name || 'VESTROO'}
                  </div>
                  {header.tagline ? (
                    <div className="text-xs text-gray-600">{header.tagline}</div>
                  ) : null}
                </div>
              </>
            )}
          </Link>

          {header.navigation_links && header.navigation_links.length > 0 && (
            <div className="hidden md:flex items-center gap-10">
              {header.navigation_links.map(
                (link: { url?: string; label: string }, index: number) => (
                  <Link
                    key={index}
                    href={link.url || '#'}
                    className="text-vest-charcoal hover:text-vest-rust font-semibold transition-colors uppercase text-xs tracking-[0.12em]"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>
          )}

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

export function Header() {
  return (
    <header>
      <TopBar />
      <MainNav />
    </header>
  )
}
