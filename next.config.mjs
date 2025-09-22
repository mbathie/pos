/** @type {import('next').NextConfig} */
const nextConfig = {
  "devIndicators": false,
  "reactStrictMode": false,
  images: {
    domains: [
      'static.thenounproject.com',
      'images.unsplash.com',
      'localhost',
      'cultcha.app',
      'cultcha.syd1.digitaloceanspaces.com',
      'cultcha.syd1.cdn.digitaloceanspaces.com'
    ],
  },
  serverExternalPackages: ['mongoose', 'bcrypt'],
};

export default nextConfig;
