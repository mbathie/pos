/** @type {import('next').NextConfig} */
const nextConfig = {
  "devIndicators": false,
  "reactStrictMode": false,
  images: {
    domains: ['static.thenounproject.com', 'images.unsplash.com', 'localhost', 'cultcha.app'],
  },
  serverExternalPackages: ['mongoose', 'bcrypt'],
  // Explicitly pass environment variables to runtime
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    HOST: process.env.HOST,
    STRIPE_PUB_KEY: process.env.STRIPE_PUB_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    GOOGLE_APP_PASS: process.env.GOOGLE_APP_PASS,
    GOOGLE_APP_USER: process.env.GOOGLE_APP_USER,
  },
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
