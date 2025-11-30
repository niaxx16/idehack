import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force disable caching during build issues
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Temporarily disable PWA to fix cache issues
  disable: true,
})(nextConfig);
