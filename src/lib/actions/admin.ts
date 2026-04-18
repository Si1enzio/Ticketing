"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasAnyRole } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewerContext } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const stadiumSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  city: z.string().min(2),
});

const stadiumUpdateSchema = stadiumSchema.extend({
  stadiumId: z.string(),
});

const standSchema = z.object({
  stadiumId: z.string(),
  name: z.string().min(2),
  code: z.string().min(1),
  color: z.string().min(4),
});

const standUpdateSchema = standSchema.extend({
  standId: z.string(),
});

const sponsorSchema = z.object({
  stadiumId: z.string(),
  name: z.string().min(2),
  logoUrl: z.string().url(),
  websiteUrl: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const sponsorUpdateSchema = sponsorSchema.extend({
  sponsorId: z.string(),
});

const sectorSchema = z.object({
  stadiumId: z.string(),
  standId: z.string().optional(),
  name: z.string().min(2),
  code: z.string().min(1),
  color: z.string().min(4),
  rowsCount: z.coerce.number().int().min(1),
  seatsPerRow: z.coerce.number().int().min(1),
});

const sectorUpdateSchema = sectorSchema.extend({
  sectorId: z.string(),
});

const matchSchema = z.object({
  stadiumId: z.string(),
  title: z.string().min(4),
  slug: z.string().min(4),
  competitionName: z.string().min(2),
  opponentName: z.string().min(2),
  startsAt: z.string().min(5),
  status: z.string().default("draft"),
  maxTicketsPerUser: z.coerce.number().int().min(1),
  reservationOpensAt: z.string().optional(),
  reservationClosesAt: z.string().optional(),
  scannerEnabled: z.boolean().default(false),
  ticketingMode: z.enum(["free", "paid"]).default("free"),
  ticketPriceCents: z.coerce.number().int().min(0).default(0),
  currency: z.string().min(3).max(3).default("MDL"),
});

const matchUpdateSchema = matchSchema.extend({
  matchId: z.string(),
});

const userBlockSchema = z.object({
  userId: z.string(),
  type: z.enum(["warning", "block", "temp_ban"]),
  reason: z.string().min(3),
  note: z.string().optional(),
  endsAt: z.string().optional(),
});

const roleSchema = z.object({
  userId: z.string(),
  role: z.enum(["steward", "admin", "superadmin", "user"]),
});

const reservationAccessSchema = z.object({
  userId: z.string(),
  canReserve: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((value) => value === true || value === "true"),
});

const seatToggleSchema = z.object({
  seatId: z.string(),
  flag: z.enum(["is_disabled", "is_obstructed", "is_internal_only"]),
  value: z.boolean(),
});

const subscriptionAssignSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  startsAt: z.string().min(5),
  note: z.string().optional(),
});

const ticketActionSchema = z.object({
  ticketId: z.string(),
  reason: z.string().optional(),
});

async function ensureAdmin(): Promise<
  Awaited<ReturnType<typeof getViewerContext>> & { userId: string }
> {
  const viewer = await getViewerContext();

  if (!viewer.userId || !hasAnyRole(viewer.roles, ["admin", "superadmin"])) {
    throw new Error("Acces interzis pentru această acțiune.");
  }

  return {
    ...viewer,
    userId: viewer.userId,
  };
}

async function logAudit(actorUserId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

export async function createStadiumAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = stadiumSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("stadiums")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      city: parsed.data.city,
      club_name: "FC Milsami Orhei",
      created_by: viewer.userId,
    })
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await logAudit(viewer.userId, "create_stadium", "stadiums", data.id, parsed.data);
  }

  revalidatePath("/admin/stadion");
}

export async function createSectorAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = sectorSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    standId: (formData.get("standId") || undefined) ?? undefined,
    name: formData.get("name"),
    code: formData.get("code"),
    color: formData.get("color"),
    rowsCount: formData.get("rowsCount"),
    seatsPerRow: formData.get("seatsPerRow"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("stadium_sectors")
    .insert({
      stadium_id: parsed.data.stadiumId,
      stand_id: parsed.data.standId || null,
      name: parsed.data.name,
      code: parsed.data.code,
      color: parsed.data.color,
      rows_count: parsed.data.rowsCount,
      seats_per_row: parsed.data.seatsPerRow,
    })
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await supabase.rpc("generate_sector_seats", {
      p_sector_id: data.id,
      p_rows_count: parsed.data.rowsCount,
      p_seats_per_row: parsed.data.seatsPerRow,
      p_replace_existing: true,
    });
    await logAudit(viewer.userId, "create_sector", "stadium_sectors", data.id, parsed.data);
  }

  revalidatePath("/admin/stadion");
}

export async function updateStadiumAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = stadiumUpdateSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("stadiums")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      city: parsed.data.city,
    })
    .eq("id", parsed.data.stadiumId);

  await logAudit(viewer.userId, "update_stadium", "stadiums", parsed.data.stadiumId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function updateSectorAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = sectorUpdateSchema.safeParse({
    sectorId: formData.get("sectorId"),
    stadiumId: formData.get("stadiumId"),
    standId: (formData.get("standId") || undefined) ?? undefined,
    name: formData.get("name"),
    code: formData.get("code"),
    color: formData.get("color"),
    rowsCount: formData.get("rowsCount"),
    seatsPerRow: formData.get("seatsPerRow"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data: seats } = await supabase
    .from("seats")
    .select("row_label, seat_number")
    .eq("sector_id", parsed.data.sectorId);

  const seatRows = (seats ?? []) as Array<{ row_label: string; seat_number: number }>;
  const maxExistingRow = seatRows.reduce((max, seat) => {
    const rowNumber = Number(seat.row_label);
    return Number.isNaN(rowNumber) ? max : Math.max(max, rowNumber);
  }, 0);
  const maxExistingSeat = seatRows.reduce(
    (max, seat) => Math.max(max, Number(seat.seat_number)),
    0,
  );

  if (
    parsed.data.rowsCount < maxExistingRow ||
    parsed.data.seatsPerRow < maxExistingSeat
  ) {
    throw new Error(
      "Reducerea numarului de randuri sau locuri necesita o operatiune controlata. Poti doar extinde layout-ul din editorul actual.",
    );
  }

  await supabase
    .from("stadium_sectors")
    .update({
      stadium_id: parsed.data.stadiumId,
      stand_id: parsed.data.standId || null,
      name: parsed.data.name,
      code: parsed.data.code,
      color: parsed.data.color,
      rows_count: parsed.data.rowsCount,
      seats_per_row: parsed.data.seatsPerRow,
    })
    .eq("id", parsed.data.sectorId);

  await supabase.rpc("generate_sector_seats", {
    p_sector_id: parsed.data.sectorId,
    p_rows_count: parsed.data.rowsCount,
    p_seats_per_row: parsed.data.seatsPerRow,
    p_replace_existing: false,
  });

  await logAudit(viewer.userId, "update_sector", "stadium_sectors", parsed.data.sectorId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function toggleSeatFlagAction(input: z.input<typeof seatToggleSchema>) {
  const viewer = await ensureAdmin();
  const parsed = seatToggleSchema.safeParse(input);

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("seats")
    .update({
      [parsed.data.flag]: parsed.data.value,
    })
    .eq("id", parsed.data.seatId);

  await logAudit(viewer.userId, "toggle_seat_flag", "seats", parsed.data.seatId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function createMatchAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = matchSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    competitionName: formData.get("competitionName"),
    opponentName: formData.get("opponentName"),
    startsAt: formData.get("startsAt"),
    status: formData.get("status"),
    maxTicketsPerUser: formData.get("maxTicketsPerUser"),
    reservationOpensAt: formData.get("reservationOpensAt") || undefined,
    reservationClosesAt: formData.get("reservationClosesAt") || undefined,
    scannerEnabled: formData.get("scannerEnabled") === "on",
    ticketingMode: formData.get("ticketingMode") || "free",
    ticketPriceCents: formData.get("ticketPriceCents") || 0,
    currency: formData.get("currency") || "MDL",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("matches")
    .insert({
      stadium_id: parsed.data.stadiumId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      competition_name: parsed.data.competitionName,
      opponent_name: parsed.data.opponentName,
      starts_at: parsed.data.startsAt,
      status: parsed.data.status,
      scanner_enabled: parsed.data.scannerEnabled,
      created_by: viewer.userId,
      updated_by: viewer.userId,
    })
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await supabase.from("match_settings").upsert({
      match_id: data.id,
      max_tickets_per_user: parsed.data.maxTicketsPerUser,
      opens_at: parsed.data.reservationOpensAt ?? null,
      closes_at: parsed.data.reservationClosesAt ?? null,
      ticketing_mode: parsed.data.ticketingMode,
      ticket_price_cents:
        parsed.data.ticketingMode === "paid" ? parsed.data.ticketPriceCents : 0,
      currency: parsed.data.currency,
    });
    await logAudit(viewer.userId, "create_match", "matches", data.id, parsed.data);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/meciuri");
}

export async function createStandAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = standSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    name: formData.get("name"),
    code: formData.get("code"),
    color: formData.get("color"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("stadium_stands")
    .insert({
      stadium_id: parsed.data.stadiumId,
      name: parsed.data.name,
      code: parsed.data.code,
      color: parsed.data.color,
    })
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await logAudit(viewer.userId, "create_stand", "stadium_stands", data.id, parsed.data);
  }

  revalidatePath("/admin/stadion");
}

export async function createSponsorAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = sponsorSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    websiteUrl: formData.get("websiteUrl") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("stadium_sponsors")
    .insert({
      stadium_id: parsed.data.stadiumId,
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl,
      website_url: parsed.data.websiteUrl || null,
      sort_order: parsed.data.sortOrder,
    })
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await logAudit(viewer.userId, "create_stadium_sponsor", "stadium_sponsors", data.id, parsed.data);
  }

  revalidatePath("/admin/stadion");
}

export async function updateSponsorAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = sponsorUpdateSchema.safeParse({
    sponsorId: formData.get("sponsorId"),
    stadiumId: formData.get("stadiumId"),
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    websiteUrl: formData.get("websiteUrl") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("stadium_sponsors")
    .update({
      stadium_id: parsed.data.stadiumId,
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl,
      website_url: parsed.data.websiteUrl || null,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", parsed.data.sponsorId);

  await logAudit(viewer.userId, "update_stadium_sponsor", "stadium_sponsors", parsed.data.sponsorId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function updateStandAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = standUpdateSchema.safeParse({
    standId: formData.get("standId"),
    stadiumId: formData.get("stadiumId"),
    name: formData.get("name"),
    code: formData.get("code"),
    color: formData.get("color"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("stadium_stands")
    .update({
      stadium_id: parsed.data.stadiumId,
      name: parsed.data.name,
      code: parsed.data.code,
      color: parsed.data.color,
    })
    .eq("id", parsed.data.standId);

  await logAudit(viewer.userId, "update_stand", "stadium_stands", parsed.data.standId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function updateMatchAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = matchUpdateSchema.safeParse({
    matchId: formData.get("matchId"),
    stadiumId: formData.get("stadiumId"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    competitionName: formData.get("competitionName"),
    opponentName: formData.get("opponentName"),
    startsAt: formData.get("startsAt"),
    status: formData.get("status"),
    maxTicketsPerUser: formData.get("maxTicketsPerUser"),
    reservationOpensAt: formData.get("reservationOpensAt") || undefined,
    reservationClosesAt: formData.get("reservationClosesAt") || undefined,
    scannerEnabled: formData.get("scannerEnabled") === "on",
    ticketingMode: formData.get("ticketingMode") || "free",
    ticketPriceCents: formData.get("ticketPriceCents") || 0,
    currency: formData.get("currency") || "MDL",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("matches")
    .update({
      stadium_id: parsed.data.stadiumId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      competition_name: parsed.data.competitionName,
      opponent_name: parsed.data.opponentName,
      starts_at: parsed.data.startsAt,
      status: parsed.data.status,
      scanner_enabled: parsed.data.scannerEnabled,
      updated_by: viewer.userId,
    })
    .eq("id", parsed.data.matchId);

  await supabase.from("match_settings").upsert({
    match_id: parsed.data.matchId,
    max_tickets_per_user: parsed.data.maxTicketsPerUser,
    opens_at: parsed.data.reservationOpensAt ?? null,
    closes_at: parsed.data.reservationClosesAt ?? null,
    ticketing_mode: parsed.data.ticketingMode,
    ticket_price_cents:
      parsed.data.ticketingMode === "paid" ? parsed.data.ticketPriceCents : 0,
    currency: parsed.data.currency,
  });

  await logAudit(viewer.userId, "update_match", "matches", parsed.data.matchId, parsed.data);

  revalidatePath("/admin");
  revalidatePath("/admin/meciuri");
}

export async function createUserBlockAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = userBlockSchema.safeParse({
    userId: formData.get("userId"),
    type: formData.get("type"),
    reason: formData.get("reason"),
    note: formData.get("note") || undefined,
    endsAt: formData.get("endsAt") || undefined,
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("user_blocks")
    .insert({
      user_id: parsed.data.userId,
      type: parsed.data.type,
      reason: parsed.data.reason,
      note: parsed.data.note ?? null,
      ends_at: parsed.data.endsAt ?? null,
      is_active: true,
      created_by: viewer.userId,
    })
    .select("id")
    .maybeSingle();

  await supabase.from("admin_notes").insert({
    user_id: parsed.data.userId,
    author_user_id: viewer.userId,
    note_type: "moderation",
    content: parsed.data.note ?? parsed.data.reason,
  });

  if (data?.id) {
    await logAudit(viewer.userId, "create_user_block", "user_blocks", data.id, parsed.data);
  }

  revalidatePath("/admin/utilizatori");
  revalidatePath("/admin/abuz");
}

export async function assignRoleAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  if (!viewer.roles.includes("superadmin")) {
    throw new Error("Doar superadmin poate gestiona rolurile.");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("user_roles")
    .upsert({
      user_id: parsed.data.userId,
      role: parsed.data.role,
    });

  await logAudit(viewer.userId, "assign_role", "user_roles", parsed.data.userId, parsed.data);

  revalidatePath("/admin/utilizatori");
}

export async function setReservationAccessAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = reservationAccessSchema.safeParse({
    userId: formData.get("userId"),
    canReserve: formData.get("canReserve"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("profiles")
    .update({
      can_reserve: parsed.data.canReserve,
    })
    .eq("id", parsed.data.userId);

  await logAudit(
    viewer.userId,
    parsed.data.canReserve ? "grant_reservation_access" : "revoke_reservation_access",
    "profiles",
    parsed.data.userId,
    parsed.data,
  );

  revalidatePath("/admin/utilizatori");
}

export async function cancelTicketAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = ticketActionSchema.safeParse({
    ticketId: formData.get("ticketId"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase.rpc("cancel_ticket_admin", {
    p_ticket_id: parsed.data.ticketId,
    p_reason: parsed.data.reason ?? "Anulat de admin",
    p_actor_id: viewer.userId,
  });

  revalidatePath("/admin");
}

export async function reissueTicketAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = ticketActionSchema.safeParse({
    ticketId: formData.get("ticketId"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  await supabase.rpc("reissue_ticket_qr", {
    p_ticket_id: parsed.data.ticketId,
    p_actor_id: viewer.userId,
  });

  revalidatePath("/admin");
}

export async function assignUserSubscriptionAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = subscriptionAssignSchema.safeParse({
    userId: formData.get("userId"),
    productId: formData.get("productId"),
    startsAt: formData.get("startsAt"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data: product } = await supabase
    .from("subscription_products")
    .select("id, duration_months, price_cents, currency")
    .eq("id", parsed.data.productId)
    .maybeSingle();

  if (!product) {
    throw new Error("Produsul de abonament nu exista.");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + Number(product.duration_months ?? 0));

  const { data } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: parsed.data.userId,
      product_id: parsed.data.productId,
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price_paid_cents: Number(product.price_cents ?? 0),
      currency: String(product.currency ?? "MDL"),
      source: "admin_assignment",
      note: parsed.data.note ?? null,
      created_by: viewer.userId,
    })
    .select("id")
    .maybeSingle();

  if (data?.id) {
    await logAudit(
      viewer.userId,
      "assign_subscription",
      "user_subscriptions",
      data.id,
      parsed.data,
    );
  }

  revalidatePath(`/admin/utilizatori/${parsed.data.userId}`);
  revalidatePath("/cabinet");
}
