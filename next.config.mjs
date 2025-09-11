/** @type {import('next').NextConfig} */
const nextConfig = {
  "devIndicators": false,
  "reactStrictMode": false,
  images: {
    domains: ['static.thenounproject.com', 'images.unsplash.com', 'localhost', 'cultcha.app'],
  },
  serverExternalPackages: ['mongoose', 'bcrypt'],
};

export default nextConfig;
