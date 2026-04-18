"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const holdSchema = z.object({
  matchId: z.string().uuid(),
  seatIds: z.array(z.string()).min(1, "Selecteaza cel putin un loc."),
  gateId: z.string().uuid().nullable().optional(),
});

const confirmSchema = z.object({
  matchId: z.string().uuid(),
  holdToken: z.string().uuid(),
  source: z.string().default("public_reservation"),
});

const paymentSchema = z.object({
  matchId: z.string().uuid(),
  holdToken: z.string().uuid(),
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
        "Supabase nu este configurat. Seteaza mediul si ruleaza migratiile inainte de test.",
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
    message: data?.message ?? "Locurile au fost blocate temporar pentru emitere.",
    holdToken: data?.hold_token ?? null,
    expiresAt: data?.expires_at ?? null,
    ticketingMode: data?.ticketing_mode ?? "free",
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
        "Supabase nu este configurat. Seteaza mediul si ruleaza migratiile inainte de test.",
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
    message: data?.message ?? "Biletele au fost emise cu succes.",
    reservationId: data?.reservation_id ?? null,
  };
}

export async function completeDemoCheckoutAction(input: z.input<typeof paymentSchema>) {
  const parsed = paymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Date invalide pentru plata.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Supabase nu este configurat. Seteaza mediul si ruleaza migratiile inainte de test.",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Nu am putut crea conexiunea Supabase.",
    };
  }

  const { data, error } = await supabase.rpc("complete_demo_payment", {
    p_match_id: parsed.data.matchId,
    p_hold_token: parsed.data.holdToken,
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
    message: data?.message ?? "Plata demo a fost confirmata.",
    reservationId: data?.reservation_id ?? null,
  };
}
