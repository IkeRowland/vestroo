import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
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

