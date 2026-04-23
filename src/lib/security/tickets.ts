import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { jwtVerify } from "jose";
import QRCode from "qrcode";
import { z } from "zod";

const ticketPayloadSchema = z.object({
  code: z.string(),
  matchId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  kind: z.literal("ticket"),
});

export type TicketPayload = z.infer<typeof ticketPayloadSchema>;

const subscriptionPayloadSchema = z.object({
  code: z.string(),
  version: z.number().int().nonnegative(),
  kind: z.literal("subscription"),
});

export type SubscriptionPayload = z.infer<typeof subscriptionPayloadSchema>;

const accessPayloadSchema = z.discriminatedUnion("kind", [
  ticketPayloadSchema,
  subscriptionPayloadSchema,
]);

export type AccessPayload = z.infer<typeof accessPayloadSchema>;

const compactTicketPayloadSchema = z.object({
  c: z.string(),
  v: z.number().int().nonnegative(),
  k: z.literal("t"),
});

const compactSubscriptionPayloadSchema = z.object({
  c: z.string(),
  v: z.number().int().nonnegative(),
  k: z.literal("s"),
});

const verifiedTicketPayloadSchema = z.object({
  code: z.string(),
  version: z.number().int().nonnegative(),
  kind: z.literal("ticket"),
});

const verifiedSubscriptionPayloadSchema = z.object({
  code: z.string(),
  version: z.number().int().nonnegative(),
  kind: z.literal("subscription"),
});

const verifiedAccessPayloadSchema = z.discriminatedUnion("kind", [
  verifiedTicketPayloadSchema,
  verifiedSubscriptionPayloadSchema,
]);

const encoder = new TextEncoder();
const COMPACT_ACCESS_TOKEN_PREFIX = "m1";
const COMPACT_ACCESS_TOKEN_SIGNATURE_BYTES = 16;

function getJwtSecret() {
  return encoder.encode(
    process.env.SUPABASE_JWT_SECRET ?? "milsami-demo-secret-for-local-builds-only",
  );
}

function getHmacSecret() {
  return process.env.SUPABASE_JWT_SECRET ?? "milsami-demo-secret-for-local-builds-only";
}

function encodeCode(code: string) {
  return Buffer.from(code, "utf8").toString("base64url");
}

function decodeCode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signCompactAccessToken(kind: "t" | "s", code: string, version: number) {
  const body = `${COMPACT_ACCESS_TOKEN_PREFIX}.${kind}.${encodeCode(code)}.${version}`;
  const signature = createHmac("sha256", getHmacSecret())
    .update(body)
    .digest()
    .subarray(0, COMPACT_ACCESS_TOKEN_SIGNATURE_BYTES)
    .toString("base64url");

  return `${body}.${signature}`;
}

function verifyCompactAccessToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 5 || parts[0] !== COMPACT_ACCESS_TOKEN_PREFIX) {
    return null;
  }

  const [, kind, encodedCode, rawVersion, signature] = parts;

  if (kind !== "t" && kind !== "s") {
    return null;
  }

  const version = Number(rawVersion);

  if (!Number.isInteger(version) || version < 0) {
    return null;
  }

  const body = `${COMPACT_ACCESS_TOKEN_PREFIX}.${kind}.${encodedCode}.${rawVersion}`;
  const expectedSignature = createHmac("sha256", getHmacSecret())
    .update(body)
    .digest()
    .subarray(0, COMPACT_ACCESS_TOKEN_SIGNATURE_BYTES);
  const receivedSignature = Buffer.from(signature, "base64url");

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    throw new Error("Semnatura compacta QR nu este valida.");
  }

  return verifiedAccessPayloadSchema.parse({
    code: decodeCode(encodedCode),
    version,
    kind: kind === "t" ? "ticket" : "subscription",
  });
}

export async function signTicketToken(payload: TicketPayload) {
  return signCompactAccessToken("t", payload.code, payload.version);
}

export async function signSubscriptionToken(payload: SubscriptionPayload) {
  return signCompactAccessToken("s", payload.code, payload.version);
}

export async function verifyAccessToken(token: string) {
  const compactPayload = verifyCompactAccessToken(token);

  if (compactPayload) {
    return compactPayload;
  }

  const { payload } = await jwtVerify(token, getJwtSecret());

  const compactResult = compactTicketPayloadSchema.safeParse(payload);

  if (compactResult.success) {
    return verifiedTicketPayloadSchema.parse({
      code: compactResult.data.c,
      version: compactResult.data.v,
      kind: "ticket",
    });
  }

  const compactSubscriptionResult = compactSubscriptionPayloadSchema.safeParse(payload);

  if (compactSubscriptionResult.success) {
    return verifiedAccessPayloadSchema.parse({
      code: compactSubscriptionResult.data.c,
      version: compactSubscriptionResult.data.v,
      kind: "subscription",
    });
  }

  const legacyResult = accessPayloadSchema.parse(payload);

  return verifiedAccessPayloadSchema.parse({
    code: legacyResult.code,
    version: legacyResult.version,
    kind: legacyResult.kind,
  });
}

export async function verifyTicketToken(token: string) {
  const payload = await verifyAccessToken(token);

  if (payload.kind !== "ticket") {
    throw new Error("Tokenul nu apartine unui bilet.");
  }

  return payload;
}

export function formatTicketFingerprint(token: string) {
  return token.slice(0, 12);
}

export async function generateTicketQrDataUrl(payload: TicketPayload) {
  const qrToken = await signTicketToken(payload);

  return QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}

export async function generateSubscriptionQrDataUrl(payload: SubscriptionPayload) {
  const qrToken = await signSubscriptionToken(payload);

  return QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}
