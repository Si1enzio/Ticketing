import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/env";

function normalizeOrigin(candidate: string | null | undefined) {
  const value = candidate?.trim();

  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export async function getServerSiteOrigin() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.trim();
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.trim();
  const host = forwardedHost || requestHeaders.get("host")?.trim();

  if (host) {
    const protocol =
      forwardedProto ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  return normalizeOrigin(env.siteUrl) ?? "https://tickethub.md";
}
