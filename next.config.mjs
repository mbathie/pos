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
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    return config;
  },
};

export default nextConfig;
