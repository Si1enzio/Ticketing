import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSeatHoldSessionId, normalizeSeatHoldSessionId, seatHoldSessionCookieName } from "@/lib/seat-hold-session";
import { sanitizeUserFacingErrorMessage, withNoStoreHeaders } from "@/lib/security/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const acquireSchema = z.object({
  matchId: z.string().uuid(),
  seatId: z.string().uuid(),
  gateId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Supabase nu este configurat." },
      { status: 503, headers: withNoStoreHeaders() },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = acquireSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Date invalide." },
      { status: 400, headers: withNoStoreHeaders() },
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Nu am putut crea conexiunea Supabase." },
      { status: 503, headers: withNoStoreHeaders() },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const currentSessionId =
    normalizeSeatHoldSessionId(
      cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${seatHoldSessionCookieName}=`))
        ?.split("=")[1],
    ) ?? createSeatHoldSessionId();

  const { data, error } = await supabase.rpc("acquire_seat_hold", {
    p_match_id: parsed.data.matchId,
    p_seat_id: parsed.data.seatId,
    p_session_id: currentSessionId,
    p_gate_id: parsed.data.gateId ?? null,
  });

  if (error) {
    const normalizedMessage = error.message?.replace(/\s+/g, " ").trim() ?? "";
    const isSeatConflict = normalizedMessage.includes(
      "Acest loc tocmai a fost selectat de alt utilizator.",
    );

    return NextResponse.json(
      {
        ok: false,
        message: sanitizeUserFacingErrorMessage(
          error.message,
          isSeatConflict
            ? "Acest loc tocmai a fost selectat de alt utilizator. Te rugam sa alegi alt loc."
            : "Locul nu a putut fi blocat temporar acum. Reincarca pagina si incearca din nou.",
        ),
      },
      { status: 409, headers: withNoStoreHeaders() },
    );
  }

  const response = NextResponse.json(
    { ok: true, summary: data },
    { headers: withNoStoreHeaders() },
  );

  response.cookies.set(seatHoldSessionCookieName, currentSessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
