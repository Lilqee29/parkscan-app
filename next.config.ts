import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow unoptimized local images (the 2K JPEG assets)
  images: {
    unoptimized: true,
  },

  // PWA headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

};

export default nextConfig;
