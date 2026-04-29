import { NextResponse } from "next/server";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSeatHoldSessionId, normalizeSeatHoldSessionId, seatHoldSessionCookieName } from "@/lib/seat-hold-session";
import { sanitizeUserFacingErrorMessage, withNoStoreHeaders } from "@/lib/security/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const extendSchema = z.object({
  matchId: z.string().uuid(),
  holdToken: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Supabase nu este configurat." },
      { status: 503, headers: withNoStoreHeaders() },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = extendSchema.safeParse(body);

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

  const { data, error } = await supabase.rpc("extend_seat_hold", {
    p_match_id: parsed.data.matchId,
    p_hold_token: parsed.data.holdToken,
    p_session_id: currentSessionId,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: sanitizeUserFacingErrorMessage(
          error.message,
          "Unele locuri nu mai sunt disponibile. Te rugam sa actualizezi selectia.",
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
