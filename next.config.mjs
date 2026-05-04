/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Skip type-checking and linting at build time — the Pi can't finish tsc
  // in a reasonable time. Run `tsc --noEmit` and `next lint` in dev/CI instead.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
