import type { NextConfig } from "next";

function normalizeAllowedOriginHost(value: string | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(normalizedValue).host;
  } catch {
    return (
      normalizedValue.replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null
    );
  }
}

function collectAllowedOriginHosts() {
  const configuredOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_ADDITIONAL_ALLOWED_ORIGINS,
    process.env.ADDITIONAL_ALLOWED_ORIGINS,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "https://tickethub.md",
    "https://www.tickethub.md",
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => normalizeAllowedOriginHost(value));

  return Array.from(
    new Set(configuredOrigins.filter((value): value is string => Boolean(value))),
  );
}

const allowedOrigins = collectAllowedOriginHosts();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
