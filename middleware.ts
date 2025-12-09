import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware for additional request handling
// Can be extended for auth, redirects, etc.
// Note: Route detection for PayloadCMS is handled via official suppressHydrationWarning config
// See payload.config.ts admin.suppressHydrationWarning
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add any custom middleware logic here
  // (e.g., authentication, redirects, headers)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

