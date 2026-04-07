import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'geolocation=(self), microphone=(), camera=(), payment=(), usb=()',
  },
] as const

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...securityHeaders],
      },
    ]
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    // Allow images from Supabase Storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.storage.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Configure webpack to handle dynamic requires and server-only modules
  webpack: (config, { isServer }) => {
    // Only apply these changes on server side
    if (isServer) {
      // Ignore problematic files in node_modules (README.md, .exe, .bin files) 
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.(md|exe|bin)$/,
        type: 'asset/resource',
        generator: {
          emit: false,
        },
      });
    }
    return config;
  },
};

export default nextConfig;

