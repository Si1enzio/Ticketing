import { NextResponse } from "next/server";
import { z } from "zod";

import { hasAnyRole } from "@/lib/auth/roles";
import { scanResponseSchema } from "@/lib/domain/types";
import {
  formatTicketFingerprint,
  verifyAccessToken,
} from "@/lib/security/tickets";
import { getViewerContext } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  token: z.string().min(8),
  matchId: z.string().uuid(),
  deviceLabel: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["steward", "admin", "superadmin"])) {
    return NextResponse.json(
      {
        result: "blocked",
        message: "Nu ai permisiunea de a folosi scannerul.",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        result: "invalid_token",
        message: "Payload invalid pentru validare.",
      },
      { status: 400 },
    );
  }

  if (!viewer.userId) {
    return NextResponse.json(
      {
        result: "blocked",
        message: "Sesiunea stewardului nu este valida.",
      },
      { status: 403 },
    );
  }

  let payload: Awaited<ReturnType<typeof verifyAccessToken>>;

  try {
    payload = await verifyAccessToken(parsed.data.token);
  } catch {
    return NextResponse.json(
      {
        result: "invalid_token",
        message: "Semnatura QR nu este valida.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        result: "invalid_token",
        message: "Conexiunea Supabase nu este disponibila.",
      },
      { status: 500 },
    );
  }

  const tokenFingerprint = formatTicketFingerprint(parsed.data.token);
  const rpcName =
    payload.kind === "subscription" ? "scan_subscription_token" : "scan_ticket_token";
  const rpcPayload =
    payload.kind === "subscription"
      ? {
          p_match_id: parsed.data.matchId,
          p_subscription_code: payload.code,
          p_token_version: payload.version,
          p_steward_id: viewer.userId,
          p_gate_id: null,
          p_device_label: parsed.data.deviceLabel ?? null,
          p_token_fingerprint: tokenFingerprint,
        }
      : {
          p_match_id: parsed.data.matchId,
          p_ticket_code: payload.code,
          p_token_version: payload.version,
          p_steward_id: viewer.userId,
          p_gate_id: null,
          p_device_label: parsed.data.deviceLabel ?? null,
          p_token_fingerprint: tokenFingerprint,
        };

  const { data, error } = await supabase.rpc(rpcName, rpcPayload);

  if (error) {
    return NextResponse.json(
      {
        result: "invalid_token",
        message: error.message,
      },
      { status: 400 },
    );
  }

  const result = scanResponseSchema.parse({
    result: data?.result ?? "invalid_token",
    message: data?.message ?? "Raspuns gol de la validare.",
    credentialKind: data?.credential_kind ?? payload.kind,
    ticketCode: data?.ticket_code ?? data?.subscription_code ?? null,
    matchTitle: data?.match_title ?? null,
    seatLabel: data?.seat_label ?? null,
    sectorLabel: data?.sector_label ?? null,
    scannedAt: data?.scanned_at ?? null,
    holderName: data?.holder_name ?? null,
    holderBirthDate: data?.holder_birth_date ?? null,
  });

  return NextResponse.json(result);
}
