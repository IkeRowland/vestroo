import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Vestroo - Premium Shuttle Service',
  description: 'Book your premium shuttle service with Vestroo',
}

/**
 * Marketing layout - shared layout for marketing pages
 * Includes Header and Footer matching EZ Shuttle design
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
