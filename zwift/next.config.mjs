/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Completely ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Completely ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'postimg.cc',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.postimg.cc',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'v0.blob.com',
        pathname: '**',
      }
    ],
  },
}

export default nextConfig;

