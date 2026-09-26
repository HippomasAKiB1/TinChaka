/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is required for the Docker deployment but breaks
  // Vercel routing (Vercel manages its own output structure). Gate it
  // on an env var that only the Dockerfile sets.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
};

module.exports = nextConfig;
