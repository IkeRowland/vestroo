import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware for additional request handling (auth, redirects, headers, etc.)
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/ops') || pathname.startsWith('/field')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
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

