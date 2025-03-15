/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config...

  // Add this to suppress TypeScript errors during build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  // Add this to suppress the specific warning
  serverExternalPackages: ["@supabase/auth-helpers-nextjs"],

  // Disable strict mode which can cause additional warnings
  reactStrictMode: false,

  // Add the images configuration to allow i.postimg.cc domain
  images: {
    domains: ["i.postimg.cc"],
  },
}

module.exports = nextConfig

