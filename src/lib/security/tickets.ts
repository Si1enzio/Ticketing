import "server-only";

import { SignJWT, jwtVerify } from "jose";
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

function getJwtSecret() {
  return encoder.encode(
    process.env.SUPABASE_JWT_SECRET ?? "milsami-demo-secret-for-local-builds-only",
  );
}

export async function signTicketToken(payload: TicketPayload) {
  const compactPayload = {
    c: payload.code,
    v: payload.version,
    k: "t" as const,
  };

  return new SignJWT(compactPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getJwtSecret());
}

export async function signSubscriptionToken(payload: SubscriptionPayload) {
  const compactPayload = {
    c: payload.code,
    v: payload.version,
    k: "s" as const,
  };

  return new SignJWT(compactPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string) {
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
    errorCorrectionLevel: "L",
    margin: 1,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}

export async function generateSubscriptionQrDataUrl(payload: SubscriptionPayload) {
  const qrToken = await signSubscriptionToken(payload);

  return QRCode.toDataURL(qrToken, {
    errorCorrectionLevel: "L",
    margin: 1,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}
