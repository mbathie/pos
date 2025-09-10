/** @type {import('next').NextConfig} */
const nextConfig = {
  "devIndicators": false,
  "reactStrictMode": false,
  images: {
    domains: ['static.thenounproject.com', 'images.unsplash.com', 'localhost', 'cultcha.app'],
  },
  serverExternalPackages: ['mongoose', 'bcrypt'],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    return config;
  },
  async headers() {
    return [
      {
        // Apply CORS headers to all /api/c/* routes (customer API)
        source: '/api/c/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // In production, replace with your Flutter app's domain
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
