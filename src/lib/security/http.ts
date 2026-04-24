import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/env";

const DATABASE_ERROR_PATTERN =
  /\b(select|insert|update|delete|join|outer join|constraint|relation|schema|syntax|column|postgres|supabase|rpc|query|violates|duplicate key|null(?:able)? side)\b/i;

function normalizeOrigin(candidate: string | null | undefined) {
  const normalizedCandidate = candidate?.trim();

  if (!normalizedCandidate) {
    return null;
  }

  try {
    return new URL(normalizedCandidate).origin;
  } catch {
    return null;
  }
}

function getRequestOriginFromHeaders(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.trim();
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.trim();
  const host = forwardedHost || requestHeaders.get("host")?.trim();

  if (!host) {
    return null;
  }

  const protocol =
    forwardedProto || (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return normalizeOrigin(`${protocol}://${host}`);
}

export function getAllowedOrigins(requestUrl?: string) {
  const allowedOrigins = new Set<string>();
  const configuredOrigin = normalizeOrigin(env.siteUrl);

  if (configuredOrigin) {
    allowedOrigins.add(configuredOrigin);
  }

  const requestOrigin = normalizeOrigin(requestUrl);

  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }

  return allowedOrigins;
}

export function isTrustedOriginValue(
  candidate: string | null | undefined,
  requestUrl?: string,
) {
  const normalizedCandidate = normalizeOrigin(candidate);

  if (!normalizedCandidate) {
    return false;
  }

  return getAllowedOrigins(requestUrl).has(normalizedCandidate);
}

export async function ensureTrustedServerActionRequest() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const referer = requestHeaders.get("referer");
  const requestOrigin = getRequestOriginFromHeaders(requestHeaders);

  if (origin && (isTrustedOriginValue(origin, requestOrigin ?? undefined) || normalizeOrigin(origin) === requestOrigin)) {
    return;
  }

  if (
    referer &&
    (isTrustedOriginValue(referer, requestOrigin ?? undefined) ||
      normalizeOrigin(referer) === requestOrigin)
  ) {
    return;
  }

  throw new Error("Originea cererii nu este permisa.");
}

export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/cabinet",
) {
  const rawValue = candidate?.trim();

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(rawValue, "http://local.test");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withNoStoreHeaders(init?: HeadersInit) {
  const nextHeaders = new Headers(init);
  nextHeaders.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate",
  );
  nextHeaders.set("Pragma", "no-cache");
  nextHeaders.set("Expires", "0");
  nextHeaders.set("X-Robots-Tag", "noindex, noarchive, nosnippet");
  nextHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
  return nextHeaders;
}

export function sanitizeUserFacingErrorMessage(
  message: string | null | undefined,
  fallback: string,
) {
  const normalizedMessage = message?.replace(/\s+/g, " ").trim();

  if (!normalizedMessage) {
    return fallback;
  }

  if (normalizedMessage.length > 220 || DATABASE_ERROR_PATTERN.test(normalizedMessage)) {
    return fallback;
  }

  return normalizedMessage;
}
