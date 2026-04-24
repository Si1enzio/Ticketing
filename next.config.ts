import type { NextConfig } from "next";

function normalizeAllowedOriginHost(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host;
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;
  }
}

const allowedOrigins = Array.from(
  new Set(
    [
      normalizeAllowedOriginHost(process.env.NEXT_PUBLIC_SITE_URL),
      normalizeAllowedOriginHost(
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      ),
    ].filter((value): value is string => Boolean(value)),
  ),
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
