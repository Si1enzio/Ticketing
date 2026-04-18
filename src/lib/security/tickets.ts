import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const ticketPayloadSchema = z.object({
  code: z.string(),
  matchId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  kind: z.literal("ticket"),
});

export type TicketPayload = z.infer<typeof ticketPayloadSchema>;

const encoder = new TextEncoder();

function getJwtSecret() {
  return encoder.encode(
    process.env.SUPABASE_JWT_SECRET ?? "milsami-demo-secret-for-local-builds-only",
  );
}

export async function signTicketToken(payload: TicketPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(getJwtSecret());
}

export async function verifyTicketToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());

  return ticketPayloadSchema.parse(payload);
}

export function formatTicketFingerprint(token: string) {
  return token.slice(0, 12);
}

