// This file helps pass environment variables to the Next.js runtime in AWS Amplify
// Amplify doesn't automatically pass env vars to Lambda for SSR

module.exports = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    HOST: process.env.HOST,
    STRIPE_PUB_KEY: process.env.STRIPE_PUB_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
    GOOGLE_APP_PASS: process.env.GOOGLE_APP_PASS,
    GOOGLE_APP_USER: process.env.GOOGLE_APP_USER,
  }
}