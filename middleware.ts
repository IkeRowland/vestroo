import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware for additional request handling
// Currently minimal - can be extended for auth, redirects, etc.
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Set header and cookie to indicate if this is a Payload CMS admin route
  // Payload routes are under /admin and need to handle their own html/body     
  const isPayloadRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isPayloadRoute) {
    response.headers.set('x-payload-route', 'true')
    // Also set pathname header for fallback detection
    response.headers.set('x-pathname', request.nextUrl.pathname)
    // Set cookie as additional fallback (more reliable than headers in some cases)
    response.cookies.set('x-payload-route', 'true', { 
      path: '/',
      httpOnly: false, // Allow client-side access if needed
      sameSite: 'lax'
    })
  } else {
    // Clear cookie if not a Payload route
    response.cookies.delete('x-payload-route')
  }

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

