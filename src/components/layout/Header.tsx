'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { VestrooMark } from '@/components/brand/VestrooMark'
import { siteSettings } from '@/content/site-settings'
import { getImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

function TopBar() {
  const topBar = siteSettings.top_bar
  const hasBrandLeft = Boolean(topBar.brand_left?.trim())

  return (
    <div className="bg-vest-rust text-white py-2 px-4">
      <div
        className={cn(
          'container mx-auto max-w-7xl flex flex-wrap items-center gap-2 text-sm',
          hasBrandLeft ? 'justify-between' : 'justify-end',
        )}
      >
        {hasBrandLeft ? (
          <span className="font-semibold tracking-wide">{topBar.brand_left}</span>
        ) : null}
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
              href={topBar.client_login_url || '/account/login'}
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
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const original = document.body.style.overflow
    document.body.style.overflow = mobileOpen ? 'hidden' : original
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-[5.25rem]">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
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
            type="button"
            variant="ghost"
            className="md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" aria-hidden />
            ) : (
              <Menu className="w-6 h-6" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          'md:hidden border-t border-gray-100 bg-white transition-all duration-200 overflow-hidden',
          mobileOpen ? 'max-h-[80vh]' : 'max-h-0',
        )}
        aria-hidden={!mobileOpen}
      >
        {header.navigation_links && header.navigation_links.length > 0 ? (
          <ul className="container mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            {header.navigation_links.map(
              (link: { url?: string; label: string }, index: number) => (
                <li key={index}>
                  <Link
                    href={link.url || '#'}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-vest-charcoal hover:bg-gray-50 hover:text-vest-rust"
                  >
                    {link.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        ) : null}
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
