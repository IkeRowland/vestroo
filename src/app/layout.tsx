import type { Metadata } from 'next';
import { headers, cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vestroo - Shuttle Booking Platform',
  description: 'Book your shuttle service',
};

// Root layout must have html/body tags in Next.js 15
// PayloadCMS admin routes (in the (payload) route group) have their own layout
// that renders html/body. We detect Payload routes via middleware header/cookie and
// conditionally skip the html/body wrapper to prevent nesting conflicts.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookieStore = await cookies();

  // Check for Payload route via multiple methods for reliability
  // Try cookie first as it's more reliable during SSR
  const payloadRouteCookie = cookieStore.get('x-payload-route');
  const payloadRouteHeader = headersList.get('x-payload-route');
  const pathname = headersList.get('x-pathname') || '';
  
  // Check all available header sources
  const allHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // More comprehensive detection
  const isPayloadRoute =
    payloadRouteCookie?.value === 'true' ||
    payloadRouteHeader === 'true' ||
    pathname.startsWith('/admin') ||
    Object.values(allHeaders).some(val => val.includes('/admin'));

  // For Payload routes, return children directly as Payload's RootLayout
  // will handle the full html/body structure
  // Payload routes are in the (payload) route group which has its own layout
  if (isPayloadRoute) {
    return <>{children}</>;
  }

  // For all other routes, provide the standard html/body wrapper
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="suppress-hydration-warning">
        {children}
      </body>
    </html>
  );
}
