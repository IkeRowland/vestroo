import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

/** ISR for static marketing content modules (see VST-4). */
export const revalidate = 3600

/**
 * Marketing layout - shared layout for marketing pages
 * Includes Header and Footer for marketing pages
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
