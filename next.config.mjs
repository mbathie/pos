/** @type {import('next').NextConfig} */
const nextConfig = {
  "devIndicators": false,
  "reactStrictMode": false,
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io', '*.ngrok.app'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.thenounproject.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'cultcha.app',
      },
      {
        protocol: 'https',
        hostname: 'cultcha.syd1.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: 'cultcha.syd1.cdn.digitaloceanspaces.com',
      },
    ],
  },
  serverExternalPackages: ['mongoose', 'bcrypt'],
};

export default nextConfig;
