import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

export const seatHoldSessionCookieName = "tickethub_hold_sid";

export function createSeatHoldSessionId() {
  return randomUUID();
}

export async function getSeatHoldSessionIdFromCookies() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(seatHoldSessionCookieName)?.value?.trim();
  return existing || null;
}

export function normalizeSeatHoldSessionId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
