type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var __ticketHubRateLimitStore__: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore =
  globalThis.__ticketHubRateLimitStore__ ??
  (globalThis.__ticketHubRateLimitStore__ = new Map<string, RateLimitEntry>());

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      ok: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((entry.resetAt - now) / 1000), 1),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    ok: true,
    remaining: Math.max(limit - entry.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((entry.resetAt - now) / 1000), 1),
  };
}
