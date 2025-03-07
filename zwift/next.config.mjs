/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
      // Completely ignore TypeScript errors during build
      ignoreBuildErrors: true,
    },
    eslint: {
      // Completely ignore ESLint errors during build
      ignoreDuringBuilds: true,
    }
  }
  
  export default nextConfig;
  
  