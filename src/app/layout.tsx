import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vestroo - Shuttle Booking Platform',
  description: 'Book your shuttle service',
};

// Root layout must have html/body tags in Next.js 15 App Router
// PayloadCMS handles hydration warnings via suppressHydrationWarning config
// See payload.config.ts admin.suppressHydrationWarning (officially supported since v3.6.0)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="suppress-hydration-warning">
        {children}
      </body>
    </html>
  );
}
