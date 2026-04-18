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

const compactTicketPayloadSchema = z.object({
  c: z.string(),
  v: z.number().int().nonnegative(),
  k: z.literal("t"),
});

const verifiedTicketPayloadSchema = z.object({
  code: z.string(),
  version: z.number().int().nonnegative(),
  kind: z.literal("ticket"),
});

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

export async function verifyTicketToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  const compactResult = compactTicketPayloadSchema.safeParse(payload);

  if (compactResult.success) {
    return verifiedTicketPayloadSchema.parse({
      code: compactResult.data.c,
      version: compactResult.data.v,
      kind: "ticket",
    });
  }

  const legacyResult = ticketPayloadSchema.parse(payload);

  return verifiedTicketPayloadSchema.parse({
    code: legacyResult.code,
    version: legacyResult.version,
    kind: legacyResult.kind,
  });
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
