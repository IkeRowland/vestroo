import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
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

