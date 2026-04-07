import type { Metadata } from 'next'
import { Montserrat, Poppins } from 'next/font/google'
import './globals.css'
import { getSiteUrl } from '@/lib/site-url'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Vestroo — premium passenger transport',
    template: '%s | Vestroo',
  },
  description:
    'Chauffeured passenger transport in South Africa — premium shuttle, corporate, VIP, tours, and discreet enquiries.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en-ZA"
      className={`${montserrat.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="suppress-hydration-warning">
        {children}
      </body>
    </html>
  )
}
