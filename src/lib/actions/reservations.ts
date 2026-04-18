"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const holdSchema = z.object({
  matchId: z.string().uuid(),
  seatIds: z.array(z.string()).min(1, "Selectează cel puțin un loc."),
  gateId: z.string().uuid().nullable().optional(),
});

const confirmSchema = z.object({
  matchId: z.string().uuid(),
  holdToken: z.string().uuid(),
  source: z.string().default("public_reservation"),
});

export async function holdSeatsAction(input: z.input<typeof holdSchema>) {
  const parsed = holdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Date invalide pentru hold.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Supabase nu este configurat. Setează mediul și rulează migrațiile înainte de test.",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Nu am putut crea conexiunea Supabase.",
    };
  }

  const { data, error } = await supabase.rpc("hold_seats", {
    p_match_id: parsed.data.matchId,
    p_seat_ids: parsed.data.seatIds,
    p_gate_id: parsed.data.gateId ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: data?.message ?? "Locurile au fost blocate temporar.",
    holdToken: data?.hold_token ?? null,
    expiresAt: data?.expires_at ?? null,
  };
}

export async function confirmSeatHoldAction(input: z.input<typeof confirmSchema>) {
  const parsed = confirmSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Date invalide pentru confirmare.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Supabase nu este configurat. Setează mediul și rulează migrațiile înainte de test.",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Nu am putut crea conexiunea Supabase.",
    };
  }

  const { data, error } = await supabase.rpc("confirm_hold_reservation", {
    p_match_id: parsed.data.matchId,
    p_hold_token: parsed.data.holdToken,
    p_source: parsed.data.source,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidatePath("/cabinet");
  revalidatePath(`/confirmare/${data?.reservation_id ?? ""}`);

  return {
    ok: true,
    message: data?.message ?? "Rezervarea a fost confirmată.",
    reservationId: data?.reservation_id ?? null,
  };
}

