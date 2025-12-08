import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  // Suppress hydration warnings from PayloadCMS admin CSS injection
  // This is a known issue with PayloadCMS and Next.js 15
  // The warnings don't affect functionality but are noisy in development
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

export default withPayload(nextConfig);

