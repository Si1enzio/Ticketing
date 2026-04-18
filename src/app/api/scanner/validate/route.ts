import { NextResponse } from "next/server";
import { z } from "zod";

import { hasAnyRole } from "@/lib/auth/roles";
import { scanResponseSchema } from "@/lib/domain/types";
import { formatTicketFingerprint, verifyTicketToken } from "@/lib/security/tickets";
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

  let payload;

  try {
    payload = await verifyTicketToken(parsed.data.token);
  } catch {
    return NextResponse.json(
      {
        result: "invalid_token",
        message: "Semnătura QR nu este validă.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        result: "invalid_token",
        message: "Conexiunea Supabase nu este disponibilă.",
      },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.rpc("scan_ticket_token", {
    p_match_id: parsed.data.matchId,
    p_ticket_code: payload.code,
    p_token_version: payload.version,
    p_steward_id: viewer.userId,
    p_gate_id: null,
    p_device_label: parsed.data.deviceLabel ?? null,
    p_token_fingerprint: formatTicketFingerprint(parsed.data.token),
  });

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
    message: data?.message ?? "Răspuns gol de la validare.",
    ticketCode: data?.ticket_code ?? null,
    matchTitle: data?.match_title ?? null,
    seatLabel: data?.seat_label ?? null,
    sectorLabel: data?.sector_label ?? null,
    scannedAt: data?.scanned_at ?? null,
  });

  return NextResponse.json(result);
}

