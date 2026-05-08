import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
    staleTimes: { dynamic: 0 },
  },
  // Skip type-checking and linting at build time — the Pi can't finish tsc
  // in a reasonable time. Run `tsc --noEmit` and `next lint` in dev/CI instead.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  // Skip source map upload if org/project are not configured
  sourcemaps: {
    disable: !process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT,
  },
});
