"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAnyRole } from "@/lib/auth/roles";
import { localDateTimeToIsoString } from "@/lib/date-time";
import { profileGenderSchema } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/env";
import { isSupabaseAdminConfigured } from "@/lib/env.server";
import {
  ensureTrustedServerActionRequest,
  sanitizeUserFacingErrorMessage,
} from "@/lib/security/http";
import { stadiumMapConfigSchema } from "@/lib/stadium/stadium-schema";
import { getViewerContext } from "@/lib/supabase/queries";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

const stadiumSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  city: z.string().min(2),
  organizerId: z.string().uuid().optional().or(z.literal("")),
});

const stadiumUpdateSchema = stadiumSchema.extend({
  stadiumId: z.string(),
});

const organizerSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2),
  category: z.string().trim().min(2).max(50).default("club"),
  description: z.string().trim().max(1200).optional().or(z.literal("")),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
});

const organizerUpdateSchema = organizerSchema.extend({
  organizerId: z.string().uuid(),
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

const standDeleteSchema = z.object({
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
  gateId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2),
  code: z.string().min(1),
  color: z.string().min(4),
  rowsCount: z.coerce.number().int().min(1),
  seatsPerRow: z.coerce.number().int().min(1),
});

const sectorUpdateSchema = sectorSchema.extend({
  sectorId: z.string(),
});

const sectorDeleteSchema = z.object({
  sectorId: z.string(),
});

const sectorMoveSchema = z.object({
  sectorId: z.string(),
  direction: z.enum(["up", "down"]),
  source: z.enum(["stadion", "builder"]).default("stadion"),
});

const matchSchema = z.object({
  stadiumId: z.string(),
  homeTeam: z.string().min(2),
  awayTeam: z.string().min(2),
  title: z.string().min(4),
  slug: z.string().min(4),
  competitionName: z.string().min(2),
  startsAt: z.string().min(5),
  posterUrl: z.string().trim().url().optional().or(z.literal("")),
  bannerUrl: z.string().trim().url().optional().or(z.literal("")),
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

const matchDeleteSchema = z.object({
  matchId: z.string(),
});

const matchSeatOverrideApplySchema = z.object({
  matchId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["blocked", "admin_hold"]),
  expiresAt: z.string().optional(),
  note: z.string().max(500).optional(),
});

const matchSeatOverrideReleaseSchema = z.object({
  matchId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1),
});

const matchSectorPricingSaveSchema = z.object({
  matchId: z.string().uuid(),
  pricing: z.array(
    z.object({
      sectorId: z.string().uuid(),
      ticketPriceCentsOverride: z.coerce
        .number()
        .int()
        .nonnegative()
        .nullable(),
    }),
  ),
});

const stadiumMapConfigSaveSchema = z.object({
  stadiumId: z.string(),
  mapKey: z.string().min(1),
  configJson: z.string().min(2),
});

const sectorLayoutCellSchema = z.object({
  kind: z.enum(["seat", "gap"]),
});

const sectorLayoutRowSchema = z.object({
  label: z.string().min(1),
  isVisible: z.boolean().optional(),
  cells: z.array(sectorLayoutCellSchema).min(1),
});

const builderSectorSchema = sectorSchema;

const sectorSeatLayoutSaveSchema = z.object({
  sectorId: z.string(),
  rowsCount: z.coerce.number().int().min(1),
  seatsPerRow: z.coerce.number().int().min(1),
  layoutJson: z.string().min(2),
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
  role: z.enum(["steward", "organizer_admin", "admin", "superadmin", "user"]),
});

const managedUserCreateSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  role: z.enum(["user", "steward", "organizer_admin", "admin", "superadmin"]),
  canReserve: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .default("true")
    .transform((value) => value === true || value === "true"),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  locality: z.string().trim().max(120).optional().or(z.literal("")),
  district: z.string().trim().max(120).optional().or(z.literal("")),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  gender: profileGenderSchema.default("unspecified"),
  preferredLanguage: z.enum(["ro", "ru"]).default("ro"),
  marketingOptIn: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .default("false")
    .transform((value) => value === true || value === "true"),
  smsOptIn: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .default("false")
    .transform((value) => value === true || value === "true"),
});

const reservationAccessSchema = z.object({
  userId: z.string(),
  canReserve: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((value) => value === true || value === "true"),
});

const managedUserDeleteSchema = z.object({
  userId: z.string().uuid(),
});

const userAccessScopeSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["steward", "organizer_admin"]),
  organizerId: z.string().uuid().optional().or(z.literal("")),
  locationId: z.string().uuid().optional().or(z.literal("")),
});

const seatToggleSchema = z.object({
  seatId: z.string(),
  flag: z.enum(["is_disabled", "is_obstructed", "is_internal_only"]),
  value: z.boolean(),
});

const subscriptionAssignSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  stadiumId: z.string(),
  seatId: z.string(),
  startsAt: z.string().min(5),
  note: z.string().optional(),
});

const ticketActionSchema = z.object({
  ticketId: z.string(),
  reason: z.string().optional(),
});

const matchMediaBucket = "event-media";
const maxMatchMediaFileSizeBytes = 12 * 1024 * 1024;
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function isOptionalSchemaError(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  return (
    code === "42703" ||
    code === "42P01" ||
    message.includes("column") ||
    message.includes("relation")
  );
}

async function getLocationOrganizerId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  locationId: string,
) {
  if (!supabase || !locationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("stadiums")
    .select("organizer_id")
    .eq("id", locationId)
    .maybeSingle();

  if (error) {
    if (isOptionalSchemaError(error)) {
      return null;
    }

    throw error;
  }

  return data?.organizer_id ?? null;
}

async function ensureAdmin(): Promise<
  Awaited<ReturnType<typeof getViewerContext>> & { userId: string }
> {
  await ensureTrustedServerActionRequest();

  const viewer = await getViewerContext();

  if (
    !viewer.userId ||
    !hasAnyRole(viewer.roles, ["organizer_admin", "admin", "superadmin"])
  ) {
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

function redirectToAdminStadium(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/stadion?${query.toString()}`);
}

function redirectToAdminMatches(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/meciuri?${query.toString()}`);
}

function redirectToAdminOrganizers(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/organizatori?${query.toString()}`);
}

function redirectToAdminUsers(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/utilizatori?${query.toString()}`);
}

export async function createOrganizerAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = organizerSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    category: formData.get("category") || "club",
    description: formData.get("description") || "",
    logoUrl: formData.get("logoUrl") || "",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminOrganizers({
      error: "Datele organizatorului nu sunt valide.",
    });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminOrganizers({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const organizerInsertPayload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    category: parsed.data.category,
    description: parsed.data.description || null,
    logo_url: parsed.data.logoUrl || null,
    created_by: viewer.userId,
    updated_by: viewer.userId,
  };

  let insertResult = await supabase
    .from("organizers")
    .insert(organizerInsertPayload)
    .select("id")
    .maybeSingle();

  if (insertResult.error && isOptionalSchemaError(insertResult.error)) {
    insertResult = await supabase
      .from("organizers")
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        category: parsed.data.category,
        description: parsed.data.description || null,
        logo_url: parsed.data.logoUrl || null,
        created_by: viewer.userId,
      })
      .select("id")
      .maybeSingle();
  }

  const { data, error } = insertResult;

  if (error || !data?.id) {
    redirectToAdminOrganizers({
      error:
        sanitizeUserFacingErrorMessage(
          error?.message,
          "Organizatorul nu a putut fi creat.",
        ) ?? "Organizatorul nu a putut fi creat.",
    });
  }

  await logAudit(viewer.userId, "create_organizer", "organizers", data.id, parsed.data);
  revalidatePath("/admin/organizatori");
  revalidatePath("/admin/stadion");
  redirectToAdminOrganizers({
    notice: `Organizatorul ${parsed.data.name} a fost creat.`,
  });
}

export async function updateOrganizerAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = organizerUpdateSchema.safeParse({
    organizerId: formData.get("organizerId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    category: formData.get("category") || "club",
    description: formData.get("description") || "",
    logoUrl: formData.get("logoUrl") || "",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminOrganizers({
      error: "Datele organizatorului nu sunt valide.",
    });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminOrganizers({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  let updateResult = await supabase
    .from("organizers")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      category: parsed.data.category,
      description: parsed.data.description || null,
      logo_url: parsed.data.logoUrl || null,
      updated_by: viewer.userId,
    })
    .eq("id", parsed.data.organizerId);

  if (updateResult.error && isOptionalSchemaError(updateResult.error)) {
    updateResult = await supabase
      .from("organizers")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        category: parsed.data.category,
        description: parsed.data.description || null,
        logo_url: parsed.data.logoUrl || null,
      })
      .eq("id", parsed.data.organizerId);
  }

  const { error } = updateResult;

  if (error) {
    redirectToAdminOrganizers({
      error:
        sanitizeUserFacingErrorMessage(
          error.message,
          "Organizatorul nu a putut fi actualizat.",
        ) ?? "Organizatorul nu a putut fi actualizat.",
    });
  }

  await logAudit(
    viewer.userId,
    "update_organizer",
    "organizers",
    parsed.data.organizerId,
    parsed.data,
  );
  revalidatePath("/admin/organizatori");
  revalidatePath("/admin/stadion");
  redirectToAdminOrganizers({
    notice: `Organizatorul ${parsed.data.name} a fost actualizat.`,
  });
}

function normalizeMatchDateTime(
  value: string | undefined,
  label: string,
  options?: { required?: boolean },
): { ok: true; value: string | null } | { ok: false; message: string } {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) {
    if (options?.required) {
      return {
        ok: false,
        message: `Completeaza data si ora pentru campul „${label}”.`,
      };
    }

    return { ok: true, value: null };
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    return {
      ok: false,
      message: `Formatul pentru „${label}” nu este valid.`,
    };
  }

  const normalizedValue = rawValue.length === 16 ? `${rawValue}:00` : rawValue;
  const isoValue = localDateTimeToIsoString(normalizedValue);

  if (!isoValue) {
    return {
      ok: false,
      message: `Data sau ora selectata pentru „${label}” nu este valida.`,
    };
  }

  return {
    ok: true,
    value: isoValue,
  };
}

function getDateTimeValueFromFormData(
  formData: FormData,
  fieldName: string,
  dateFieldName: string,
  timeFieldName: string,
) {
  const explicitDate = String(formData.get(dateFieldName) ?? "").trim();
  const explicitTime = String(formData.get(timeFieldName) ?? "").trim();

  if (explicitDate) {
    return `${explicitDate}T${explicitTime || "00:00"}`;
  }

  return String(formData.get(fieldName) ?? "").trim();
}

function validateMatchScheduleWindow(input: {
  startsAtIso: string;
  reservationOpensAtIso: string | null;
  reservationClosesAtIso: string | null;
}): string | null {
  const startsAt = new Date(input.startsAtIso);
  const closesGraceDeadline = new Date(startsAt);
  closesGraceDeadline.setHours(closesGraceDeadline.getHours() + 1);

  if (input.reservationOpensAtIso) {
    const opensAt = new Date(input.reservationOpensAtIso);
    if (opensAt > startsAt) {
      return "Deschiderea ticketing-ului nu poate fi dupa startul meciului.";
    }
  }

  if (input.reservationClosesAtIso) {
    const closesAt = new Date(input.reservationClosesAtIso);
    if (closesAt > closesGraceDeadline) {
      return "Inchiderea ticketing-ului poate fi setata cel mult la o ora dupa startul meciului.";
    }
  }

  if (input.reservationOpensAtIso && input.reservationClosesAtIso) {
    const opensAt = new Date(input.reservationOpensAtIso);
    const closesAt = new Date(input.reservationClosesAtIso);

    if (opensAt >= closesAt) {
      return "Deschiderea ticketing-ului trebuie sa fie inainte de inchidere.";
    }
  }

  return null;
}

function parseLeiAmountInput(
  value: FormDataEntryValue | null,
  label: string,
): { ok: true; cents: number } | { ok: false; message: string } {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return { ok: true, cents: 0 };
  }

  const normalizedValue = rawValue.replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    return {
      ok: false,
      message: `Completeaza campul „${label}” folosind lei, cu maximum doua zecimale.`,
    };
  }

  const parsedAmount = Number(normalizedValue);

  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return {
      ok: false,
      message: `Valoarea introdusa pentru „${label}” nu este valida.`,
    };
  }

  return {
    ok: true,
    cents: Math.round(parsedAmount * 100),
  };
}

function getUploadedFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (value instanceof File && value.size > 0) {
    return value;
  }

  return null;
}

function getFileExtension(file: File) {
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  return mimeToExtension[file.type] ?? file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

async function uploadMatchMediaFile(
  file: File | null,
  matchSlug: string,
  mediaKind: "poster" | "banner",
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!file) {
    return { ok: true, url: "" };
  }

  if (file.size > maxMatchMediaFileSizeBytes) {
    return {
      ok: false,
      message:
        "Imaginea este prea mare. Foloseste un fisier de maximum 12 MB pentru fiecare poster sau banner.",
    };
  }

  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return {
      ok: false,
      message:
        "Incarcarea imaginilor necesita configurarea completa a Supabase, inclusiv cheia de service role.",
    };
  }

  if (!allowedImageMimeTypes.has(file.type)) {
    return {
      ok: false,
      message: "Fisierul incarcat trebuie sa fie o imagine PNG, JPG, WEBP, GIF sau AVIF.",
    };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Nu am putut initializa incarcarea imaginilor.",
    };
  }

  const extension = getFileExtension(file);
  const safeSlug = matchSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "match";
  const path = `matches/${safeSlug}/${mediaKind}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(matchMediaBucket)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return {
      ok: false,
      message:
        sanitizeUserFacingErrorMessage(
          uploadError.message,
          "Imaginea nu a putut fi incarcata. Incearca din nou.",
        ) ?? "Imaginea nu a putut fi incarcata. Incearca din nou.",
    };
  }

  const { data } = supabase.storage.from(matchMediaBucket).getPublicUrl(path);

  return {
    ok: true,
    url: data.publicUrl,
  };
}

async function resolveMatchMediaUrl(
  formData: FormData,
  inputName: string,
  fallbackName: string,
  matchSlug: string,
  mediaKind: "poster" | "banner",
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const fallbackUrl = String(formData.get(fallbackName) ?? "").trim();
  const uploadedFile = getUploadedFile(formData, inputName);

  if (!uploadedFile) {
    return {
      ok: true,
      url: fallbackUrl,
    };
  }

  return uploadMatchMediaFile(uploadedFile, matchSlug, mediaKind);
}

function redirectToAdminStadiumMap(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/admin/stadion/harta?${query.toString()}`);
}

function slugifyEntityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function persistTeamsCatalog(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorUserId: string,
  teamNames: string[],
) {
  if (!supabase) {
    return;
  }

  const payload = Array.from(
    new Set(teamNames.map((name) => name.trim()).filter(Boolean)),
  ).map((name) => ({
    name,
    slug: slugifyEntityName(name),
    created_by: actorUserId,
  }));

  if (!payload.length) {
    return;
  }

  const teamNamesToPersist = payload.map((item) => item.name);
  const teamSlugsToPersist = payload.map((item) => item.slug);

  const { data: existingRows, error: existingError } = await supabase
    .from("teams")
    .select("name, slug")
    .or(
      [
        `name.in.(${teamNamesToPersist.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")})`,
        `slug.in.(${teamSlugsToPersist.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")})`,
      ].join(","),
    );

  if (existingError) {
    console.error("Nu am putut verifica echipele existente din catalog.", existingError);
    throw existingError;
  }

  const existingNames = new Set((existingRows ?? []).map((row) => String(row.name)));
  const existingSlugs = new Set((existingRows ?? []).map((row) => String(row.slug)));
  const missingPayload = payload.filter(
    (item) => !existingNames.has(item.name) && !existingSlugs.has(item.slug),
  );

  if (!missingPayload.length) {
    return;
  }

  const { error } = await supabase.from("teams").insert(missingPayload);

  if (error) {
    console.error("Nu am putut sincroniza catalogul de echipe.", error);
    throw error;
  }
}

function redirectToSectorSource(
  source: z.infer<typeof sectorMoveSchema>["source"],
  params: Record<string, string>,
): never {
  if (source === "builder") {
    return redirectToAdminStadiumMap(params);
  }

  return redirectToAdminStadium(params);
}

async function ensureSeatsCanBeDeleted(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  seatIds: string[],
  redirectFn: (params: Record<string, string>) => never,
) {
  if (!supabase || !seatIds.length) {
    return;
  }

  const nowIso = new Date().toISOString();
  const [{ count: activeHoldCount }, { count: reservationItemCount }, { count: ticketCount }] =
    await Promise.all([
      supabase
        .from("seat_holds")
        .select("id", { count: "exact", head: true })
        .in("seat_id", seatIds)
        .eq("status", "active")
        .gt("expires_at", nowIso),
      supabase
        .from("reservation_items")
        .select("id", { count: "exact", head: true })
        .in("seat_id", seatIds),
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("seat_id", seatIds),
    ]);

  if ((activeHoldCount ?? 0) > 0) {
    redirectFn({
      error:
        "Operatiunea nu poate continua cat timp unele locuri au hold-uri active. Asteapta expirarea lor si incearca din nou.",
    });
  }

  if ((reservationItemCount ?? 0) > 0 || (ticketCount ?? 0) > 0) {
    redirectFn({
      error:
        "Operatiunea nu poate continua deoarece unele locuri sunt deja legate de rezervari sau bilete emise.",
    });
  }
}

async function syncSectorSeatsGate(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sectorId: string,
  gateId: string | null,
) {
  if (!supabase) {
    return;
  }

  await supabase
    .from("seats")
    .update({
      gate_id: gateId,
    })
    .eq("sector_id", sectorId);
}

async function syncSectorRowConfigsInMapConfig(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  stadiumId: string,
  sectorCode: string,
  rowConfigs: Array<{
    id: string;
    label: string;
    sortOrder: number;
    isVisible?: boolean;
    seats: Array<{ key: string; kind: "seat" | "gap"; number?: number; label?: string }>;
  }>,
) {
  if (!supabase) {
    return;
  }

  const { data } = await supabase
    .from("stadium_map_configs")
    .select("id, config")
    .eq("stadium_id", stadiumId)
    .eq("is_active", true)
    .maybeSingle();

  const row = data as { id?: string; config?: z.infer<typeof stadiumMapConfigSchema> } | null;
  if (!row?.id || !row.config) {
    return;
  }

  const nextConfig = {
    ...row.config,
    sectors: row.config.sectors.map((sector) =>
      sector.code === sectorCode
        ? {
            ...sector,
            rowConfigs,
          }
        : sector,
    ),
  };

  await supabase
    .from("stadium_map_configs")
    .update({ config: nextConfig })
    .eq("id", row.id);
}

export async function createStadiumAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = stadiumSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
    organizerId: formData.get("organizerId") || "",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const baseLocationPayload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    city: parsed.data.city,
    club_name: "Organizator",
    created_by: viewer.userId,
  };

  let insertResult = await supabase
    .from("stadiums")
    .insert({
      ...baseLocationPayload,
      organizer_id: parsed.data.organizerId || null,
    })
    .select("id")
    .maybeSingle();

  if (insertResult.error && isOptionalSchemaError(insertResult.error)) {
    insertResult = await supabase
      .from("stadiums")
      .insert(baseLocationPayload)
      .select("id")
      .maybeSingle();
  }

  const { data } = insertResult;

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
    gateId: (formData.get("gateId") || undefined) ?? undefined,
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
      gate_id: parsed.data.gateId || null,
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
    await syncSectorSeatsGate(supabase, data.id, parsed.data.gateId || null);
    await logAudit(viewer.userId, "create_sector", "stadium_sectors", data.id, parsed.data);
  }

  revalidatePath("/admin/stadion");
}

export async function createBuilderSectorAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = builderSectorSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    standId: (formData.get("standId") || undefined) ?? undefined,
    gateId: (formData.get("gateId") || undefined) ?? undefined,
    name: formData.get("name"),
    code: formData.get("code"),
    color: formData.get("color"),
    rowsCount: formData.get("rowsCount"),
    seatsPerRow: formData.get("seatsPerRow"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminStadiumMap({
      error: "Date invalide pentru crearea sectorului in builder.",
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectToAdminStadiumMap({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data } = await supabase
    .from("stadium_sectors")
    .insert({
      stadium_id: parsed.data.stadiumId,
      stand_id: parsed.data.standId || null,
      gate_id: parsed.data.gateId || null,
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
    await syncSectorSeatsGate(supabase, data.id, parsed.data.gateId || null);

    await logAudit(viewer.userId, "create_sector", "stadium_sectors", data.id, {
      ...parsed.data,
      source: "builder",
    });
  }

  revalidatePath("/admin/stadion");
  revalidatePath("/admin/stadion/harta");
  redirectToAdminStadiumMap({
    notice: `Sectorul ${parsed.data.name} a fost adaugat in builder.`,
  });
}

export async function updateStadiumAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = stadiumUpdateSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
    organizerId: formData.get("organizerId") || "",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  let updateResult = await supabase
    .from("stadiums")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      city: parsed.data.city,
      organizer_id: parsed.data.organizerId || null,
    })
    .eq("id", parsed.data.stadiumId);

  if (updateResult.error && isOptionalSchemaError(updateResult.error)) {
    updateResult = await supabase
      .from("stadiums")
      .update({
        name: parsed.data.name,
        slug: parsed.data.slug,
        city: parsed.data.city,
      })
      .eq("id", parsed.data.stadiumId);
  }

  await logAudit(viewer.userId, "update_stadium", "stadiums", parsed.data.stadiumId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function updateSectorAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const parsed = sectorUpdateSchema.safeParse({
    sectorId: formData.get("sectorId"),
    stadiumId: formData.get("stadiumId"),
    standId: (formData.get("standId") || undefined) ?? undefined,
    gateId: (formData.get("gateId") || undefined) ?? undefined,
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
      gate_id: parsed.data.gateId || null,
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
  await syncSectorSeatsGate(supabase, parsed.data.sectorId, parsed.data.gateId || null);

  await logAudit(viewer.userId, "update_sector", "stadium_sectors", parsed.data.sectorId, parsed.data);

  revalidatePath("/admin/stadion");
}

export async function deleteSectorAction(formData: FormData) {
  const parsed = sectorDeleteSchema.safeParse({
    sectorId: formData.get("sectorId"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminStadium({
      error: "Cererea de stergere a sectorului este invalida.",
    });
  }

  const input = parsed.data;

  const viewer = await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminStadium({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data: sector } = await supabase
    .from("stadium_sectors")
    .select("id, name")
    .eq("id", input.sectorId)
    .maybeSingle();

  if (!sector) {
    redirectToAdminStadium({
      error: "Sectorul nu mai exista sau a fost deja sters.",
    });
  }

  const { data: seats } = await supabase
    .from("seats")
    .select("id")
    .eq("sector_id", input.sectorId);

  const seatIds = (seats ?? []).map((seat) => seat.id);

  if (seatIds.length) {
    const nowIso = new Date().toISOString();
    const [{ count: activeHoldCount }, { count: reservationItemCount }, { count: ticketCount }] =
      await Promise.all([
        supabase
          .from("seat_holds")
          .select("id", { count: "exact", head: true })
          .in("seat_id", seatIds)
          .eq("status", "active")
          .gt("expires_at", nowIso),
        supabase
          .from("reservation_items")
          .select("id", { count: "exact", head: true })
          .in("seat_id", seatIds),
        supabase.from("tickets").select("id", { count: "exact", head: true }).in("seat_id", seatIds),
      ]);

    if ((activeHoldCount ?? 0) > 0) {
      redirectToAdminStadium({
        error:
          "Sectorul nu poate fi sters cat timp are locuri blocate temporar. Asteapta expirarea hold-urilor active.",
      });
    }

    if ((reservationItemCount ?? 0) > 0 || (ticketCount ?? 0) > 0) {
      redirectToAdminStadium({
        error:
          "Sectorul nu poate fi sters deoarece are locuri legate de rezervari sau bilete emise.",
      });
    }
  }

  await supabase.from("stadium_sectors").delete().eq("id", input.sectorId);

  await logAudit(viewer.userId, "delete_sector", "stadium_sectors", input.sectorId, {
    sectorName: sector.name,
  });

  revalidatePath("/admin/stadion");
  redirectToAdminStadium({
    notice: `Sectorul ${sector.name} a fost sters.`,
  });
}

export async function deleteBuilderSectorAction(formData: FormData) {
  const parsed = sectorDeleteSchema.safeParse({
    sectorId: formData.get("sectorId"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminStadiumMap({
      error: "Cererea de stergere a sectorului din builder este invalida.",
    });
  }

  const input = parsed.data;
  const viewer = await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminStadiumMap({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data: sector } = await supabase
    .from("stadium_sectors")
    .select("id, stadium_id, name, code")
    .eq("id", input.sectorId)
    .maybeSingle();

  if (!sector) {
    redirectToAdminStadiumMap({
      error: "Sectorul nu mai exista sau a fost deja sters.",
    });
  }

  const { data: seats } = await supabase
    .from("seats")
    .select("id")
    .eq("sector_id", input.sectorId);

  const seatIds = (seats ?? []).map((seat) => seat.id);
  await ensureSeatsCanBeDeleted(supabase, seatIds, redirectToAdminStadiumMap);

  await supabase.from("stadium_sectors").delete().eq("id", input.sectorId);

  const { data: mapConfigRow } = await supabase
    .from("stadium_map_configs")
    .select("id, config")
    .eq("stadium_id", sector.stadium_id)
    .eq("is_active", true)
    .maybeSingle();

  const configRow = mapConfigRow as {
    id?: string;
    config?: z.infer<typeof stadiumMapConfigSchema>;
  } | null;

  if (configRow?.id && configRow.config) {
    const nextConfig = {
      ...configRow.config,
      tribunes: configRow.config.tribunes.map((tribune) => ({
        ...tribune,
        sectorCodes: tribune.sectorCodes.filter((code) => code !== sector.code),
      })),
      sectors: configRow.config.sectors.filter((item) => item.code !== sector.code),
    };

    await supabase
      .from("stadium_map_configs")
      .update({ config: nextConfig })
      .eq("id", configRow.id);
  }

  await logAudit(viewer.userId, "delete_sector", "stadium_sectors", input.sectorId, {
    sectorName: sector.name,
    source: "builder",
  });

  revalidatePath("/admin/stadion");
  revalidatePath("/admin/stadion/harta");
  redirectToAdminStadiumMap({
    notice: `Sectorul ${sector.name} a fost sters din builder.`,
  });
}

export async function saveSectorSeatLayoutAction(formData: FormData) {
  const parsed = sectorSeatLayoutSaveSchema.safeParse({
    sectorId: formData.get("sectorId"),
    rowsCount: formData.get("rowsCount"),
    seatsPerRow: formData.get("seatsPerRow"),
    layoutJson: formData.get("layoutJson"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminStadiumMap({
      error: "Date invalide pentru configuratia locurilor.",
    });
  }

  let layout: Array<z.infer<typeof sectorLayoutRowSchema>>;

  try {
    layout = z.array(sectorLayoutRowSchema).parse(JSON.parse(parsed.data.layoutJson));
  } catch (error) {
    console.error("Layout JSON invalid pentru sector.", error);
    redirectToAdminStadiumMap({
      error: "Structura randurilor si locurilor este invalida.",
    });
  }

  if (
    layout.length !== parsed.data.rowsCount ||
    layout.some((row) => row.cells.length !== parsed.data.seatsPerRow)
  ) {
    redirectToAdminStadiumMap({
      error: "Layout-ul locurilor nu corespunde cu numarul de randuri si locuri pe rand.",
    });
  }

  const viewer = await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminStadiumMap({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data: sector } = await supabase
    .from("stadium_sectors")
    .select("id, stadium_id, gate_id, name, code")
    .eq("id", parsed.data.sectorId)
    .maybeSingle();

  if (!sector) {
    redirectToAdminStadiumMap({
      error: "Sectorul selectat nu mai exista.",
    });
  }

  const { data: existingSeats } = await supabase
    .from("seats")
    .select("id, row_label, seat_number")
    .eq("sector_id", parsed.data.sectorId);

  const currentSeats =
    (existingSeats ?? []) as Array<{ id: string; row_label: string; seat_number: number }>;

  const desiredSeats = layout.flatMap((row) =>
    row.cells.flatMap((cell, index) =>
      cell.kind === "seat"
        ? [
            {
              rowLabel: row.label,
              seatNumber: index + 1,
              seatLabel: `${row.label}-${index + 1}`,
            },
          ]
        : [],
    ),
  );

  const desiredSeatKeys = new Set(
    desiredSeats.map((seat) => `${seat.rowLabel}::${seat.seatNumber}`),
  );
  const currentSeatByKey = new Map(
    currentSeats.map((seat) => [`${seat.row_label}::${seat.seat_number}`, seat]),
  );

  const seatsToDelete = currentSeats.filter(
    (seat) => !desiredSeatKeys.has(`${seat.row_label}::${seat.seat_number}`),
  );

  await ensureSeatsCanBeDeleted(
    supabase,
    seatsToDelete.map((seat) => seat.id),
    redirectToAdminStadiumMap,
  );

  if (seatsToDelete.length) {
    await supabase.from("seats").delete().in(
      "id",
      seatsToDelete.map((seat) => seat.id),
    );
  }

  const seatsToInsert = desiredSeats.filter(
    (seat) => !currentSeatByKey.has(`${seat.rowLabel}::${seat.seatNumber}`),
  );

  if (seatsToInsert.length) {
    await supabase.from("seats").insert(
      seatsToInsert.map((seat) => ({
        sector_id: parsed.data.sectorId,
        row_label: seat.rowLabel,
        seat_number: seat.seatNumber,
        seat_label: seat.seatLabel,
        gate_id: sector.gate_id ?? null,
        is_disabled: false,
        is_obstructed: false,
        is_internal_only: false,
      })),
    );
  }

  await supabase
    .from("stadium_sectors")
    .update({
      rows_count: parsed.data.rowsCount,
      seats_per_row: parsed.data.seatsPerRow,
    })
    .eq("id", parsed.data.sectorId);

  await syncSectorRowConfigsInMapConfig(
    supabase,
    sector.stadium_id,
    sector.code,
    layout.map((row, rowIndex) => ({
      id: `${sector.code.toLowerCase()}-row-${rowIndex + 1}`,
      label: row.label,
      sortOrder: rowIndex,
      isVisible: row.isVisible !== false,
      seats: row.cells.map((cell, seatIndex) =>
        cell.kind === "seat"
          ? {
              key: `${row.label}-${seatIndex + 1}`,
              kind: "seat" as const,
              number: seatIndex + 1,
              label: String(seatIndex + 1),
            }
          : {
              key: `${row.label}-gap-${seatIndex + 1}`,
              kind: "gap" as const,
              label: "",
            },
      ),
    })),
  );

  await logAudit(viewer.userId, "save_sector_layout", "stadium_sectors", parsed.data.sectorId, {
    sectorName: sector.name,
    rowsCount: parsed.data.rowsCount,
    seatsPerRow: parsed.data.seatsPerRow,
  });

  revalidatePath("/admin/stadion");
  revalidatePath("/admin/stadion/harta");
  redirectToAdminStadiumMap({
    notice: `Locurile pentru sectorul ${sector.name} au fost actualizate.`,
  });
}

export async function moveSectorOrderAction(formData: FormData) {
  const parsed = sectorMoveSchema.safeParse({
    sectorId: formData.get("sectorId"),
    direction: formData.get("direction"),
    source: formData.get("source") || "stadion",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToSectorSource(parsed.success ? parsed.data.source : "stadion", {
      error: "Cererea de reordonare a sectorului este invalida.",
    });
  }

  const viewer = await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToSectorSource(parsed.data.source, {
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data: sector } = await supabase
    .from("stadium_sectors")
    .select("id, stadium_id, stand_id, sort_order, name, code")
    .eq("id", parsed.data.sectorId)
    .maybeSingle();

  if (!sector) {
    redirectToSectorSource(parsed.data.source, {
      error: "Sectorul selectat nu mai exista.",
    });
  }

  let siblingsQuery = supabase
    .from("stadium_sectors")
    .select("id, sort_order, code")
    .eq("stadium_id", sector.stadium_id)
    .order("sort_order")
    .order("code");

  siblingsQuery = sector.stand_id
    ? siblingsQuery.eq("stand_id", sector.stand_id)
    : siblingsQuery.is("stand_id", null);

  const { data: siblings, error: siblingsError } = await siblingsQuery;

  if (siblingsError) {
    console.error("Nu am putut incarca ordinea sectoarelor.", siblingsError);
    redirectToSectorSource(parsed.data.source, {
      error: "Ordinea sectoarelor nu a putut fi incarcata.",
    });
  }

  const orderedSectors = [...((siblings ?? []) as Array<{
    id: string;
    sort_order: number | null;
    code: string;
  }>)].sort((left, right) => {
    const leftOrder = Number(left.sort_order ?? 0);
    const rightOrder = Number(right.sort_order ?? 0);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.code.localeCompare(right.code);
  });

  const currentIndex = orderedSectors.findIndex((item) => item.id === parsed.data.sectorId);

  if (currentIndex === -1) {
    redirectToSectorSource(parsed.data.source, {
      error: "Sectorul selectat nu a fost gasit in ordinea curenta.",
    });
  }

  const targetIndex =
    parsed.data.direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= orderedSectors.length) {
    redirectToSectorSource(parsed.data.source, {
      error:
        parsed.data.direction === "up"
          ? "Sectorul este deja primul din lista."
          : "Sectorul este deja ultimul din lista.",
    });
  }

  const reordered = [...orderedSectors];
  const [movedSector] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, movedSector);

  await Promise.all(
    reordered.map((item, index) =>
      supabase
        .from("stadium_sectors")
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", item.id),
    ),
  );

  await logAudit(viewer.userId, "move_sector_order", "stadium_sectors", parsed.data.sectorId, {
    direction: parsed.data.direction,
    source: parsed.data.source,
    sectorName: sector.name,
    standId: sector.stand_id,
  });

  revalidatePath("/admin/stadion");
  revalidatePath("/admin/stadion/harta");
  redirectToSectorSource(parsed.data.source, {
    notice: `Ordinea pentru sectorul ${sector.name} a fost actualizata.`,
  });
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
  const ticketPriceResult = parseLeiAmountInput(formData.get("ticketPriceLei"), "Pret");

  if (!ticketPriceResult.ok) {
    redirectToAdminMatches({ error: ticketPriceResult.message });
  }

  const posterUrlResult = await resolveMatchMediaUrl(
    formData,
    "posterFile",
    "posterUrl",
    String(formData.get("slug") ?? ""),
    "poster",
  );
  if (!posterUrlResult.ok) {
    redirectToAdminMatches({ error: posterUrlResult.message });
  }

  const bannerUrlResult = await resolveMatchMediaUrl(
    formData,
    "bannerFile",
    "bannerUrl",
    String(formData.get("slug") ?? ""),
    "banner",
  );
  if (!bannerUrlResult.ok) {
    redirectToAdminMatches({ error: bannerUrlResult.message });
  }

  const parsed = matchSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    homeTeam: formData.get("homeTeam"),
    awayTeam: formData.get("awayTeam"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    competitionName: formData.get("competitionName"),
    startsAt: getDateTimeValueFromFormData(
      formData,
      "startsAt",
      "startsAtDate",
      "startsAtTime",
    ),
    posterUrl: posterUrlResult.url || String(formData.get("posterUrl") || ""),
    bannerUrl: bannerUrlResult.url || String(formData.get("bannerUrl") || ""),
    status: formData.get("status"),
    maxTicketsPerUser: formData.get("maxTicketsPerUser"),
    reservationOpensAt:
      getDateTimeValueFromFormData(
        formData,
        "reservationOpensAt",
        "reservationOpensAtDate",
        "reservationOpensAtTime",
      ) || undefined,
    reservationClosesAt:
      getDateTimeValueFromFormData(
        formData,
        "reservationClosesAt",
        "reservationClosesAtDate",
        "reservationClosesAtTime",
      ) || undefined,
    scannerEnabled: formData.get("scannerEnabled") === "on",
    ticketingMode: formData.get("ticketingMode") || "free",
    ticketPriceCents: ticketPriceResult.cents,
    currency: "MDL",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminMatches({
      error: "Datele meciului nu sunt complete sau nu au format valid.",
    });
  }

  const startsAtResult = normalizeMatchDateTime(parsed.data.startsAt, "Start meci", {
    required: true,
  });
  if (!startsAtResult.ok) {
    redirectToAdminMatches({ error: startsAtResult.message });
  }

  if (!startsAtResult.value) {
    redirectToAdminMatches({ error: "Startul meciului este obligatoriu." });
  }

  const reservationOpensAtResult = normalizeMatchDateTime(
    parsed.data.reservationOpensAt,
    "Deschidere ticketing",
  );
  if (!reservationOpensAtResult.ok) {
    redirectToAdminMatches({ error: reservationOpensAtResult.message });
  }

  const reservationClosesAtResult = normalizeMatchDateTime(
    parsed.data.reservationClosesAt,
    "Inchidere ticketing",
  );
  if (!reservationClosesAtResult.ok) {
    redirectToAdminMatches({ error: reservationClosesAtResult.message });
  }

  const scheduleError = validateMatchScheduleWindow({
    startsAtIso: startsAtResult.value,
    reservationOpensAtIso: reservationOpensAtResult.value,
    reservationClosesAtIso: reservationClosesAtResult.value,
  });

  if (scheduleError) {
    redirectToAdminMatches({ error: scheduleError });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectToAdminMatches({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const organizerId = await getLocationOrganizerId(supabase, parsed.data.stadiumId);

  try {
    await persistTeamsCatalog(supabase, viewer.userId, [
      parsed.data.homeTeam,
      parsed.data.awayTeam,
    ]);
  } catch (error) {
    console.error("Nu am putut sincroniza echipele pentru meci.", error);
    redirectToAdminMatches({
      error: "Catalogul de echipe nu a putut fi actualizat. Incearca din nou.",
    });
  }

  const baseMatchPayload = {
    stadium_id: parsed.data.stadiumId,
    title: parsed.data.title,
    slug: parsed.data.slug,
    competition_name: parsed.data.competitionName,
    opponent_name: parsed.data.awayTeam,
    starts_at: startsAtResult.value,
    poster_url: parsed.data.posterUrl || null,
    banner_url: parsed.data.bannerUrl || null,
    status: parsed.data.status,
    scanner_enabled: parsed.data.scannerEnabled,
    created_by: viewer.userId,
    updated_by: viewer.userId,
  };

  let insertMatchResult = await supabase
    .from("matches")
    .insert({
      ...baseMatchPayload,
      organizer_id: organizerId,
    })
    .select("id")
    .maybeSingle();

  if (insertMatchResult.error && isOptionalSchemaError(insertMatchResult.error)) {
    insertMatchResult = await supabase
      .from("matches")
      .insert(baseMatchPayload)
      .select("id")
      .maybeSingle();
  }

  const { data, error: insertError } = insertMatchResult;

  if (insertError || !data?.id) {
    console.error("Nu am putut crea meciul.", insertError);
    redirectToAdminMatches({
      error:
        sanitizeUserFacingErrorMessage(
          insertError?.message,
          "Meciul nu a putut fi creat. Verifica datele si incearca din nou.",
        ) ??
        "Meciul nu a putut fi creat. Verifica datele si incearca din nou.",
    });
  }

  const { error: settingsError } = await supabase.from("match_settings").upsert(
    {
      match_id: data.id,
      max_tickets_per_user: parsed.data.maxTicketsPerUser,
      opens_at: reservationOpensAtResult.value,
      closes_at: reservationClosesAtResult.value,
      ticketing_mode: parsed.data.ticketingMode,
      ticket_price_cents:
        parsed.data.ticketingMode === "paid" ? parsed.data.ticketPriceCents : 0,
      currency: "MDL",
    },
    {
      onConflict: "match_id",
    },
  );

  if (settingsError) {
    console.error("Nu am putut salva setarile meciului nou.", settingsError);
    redirectToAdminMatches({
      error:
        sanitizeUserFacingErrorMessage(
          settingsError.message,
          "Setarile meciului nu au putut fi salvate. Incearca din nou.",
        ) ??
        "Setarile meciului nu au putut fi salvate. Incearca din nou.",
    });
  }

  await logAudit(viewer.userId, "create_match", "matches", data.id, {
    ...parsed.data,
    startsAt: startsAtResult.value,
    reservationOpensAt: reservationOpensAtResult.value,
    reservationClosesAt: reservationClosesAtResult.value,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/meciuri");
  redirectToAdminMatches({
    notice: `Meciul ${parsed.data.title} a fost creat.`,
  });
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

export async function deleteStandAction(formData: FormData) {
  const parsed = standDeleteSchema.safeParse({
    standId: formData.get("standId"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminStadium({
      error: "Cererea de stergere a tribunei este invalida.",
    });
  }

  const input = parsed.data;

  const viewer = await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminStadium({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data: stand } = await supabase
    .from("stadium_stands")
    .select("id, name")
    .eq("id", input.standId)
    .maybeSingle();

  if (!stand) {
    redirectToAdminStadium({
      error: "Tribuna nu mai exista sau a fost deja stearsa.",
    });
  }

  const { count: sectorCount } = await supabase
    .from("stadium_sectors")
    .select("id", { count: "exact", head: true })
    .eq("stand_id", input.standId);

  if ((sectorCount ?? 0) > 0) {
    redirectToAdminStadium({
      error:
        "Tribuna nu poate fi stearsa cat timp contine sectoare. Muta sau sterge mai intai sectoarele din ea.",
    });
  }

  await supabase.from("stadium_stands").delete().eq("id", input.standId);

  await logAudit(viewer.userId, "delete_stand", "stadium_stands", input.standId, {
    standName: stand.name,
  });

  revalidatePath("/admin/stadion");
  redirectToAdminStadium({
    notice: `Tribuna ${stand.name} a fost stearsa.`,
  });
}

export async function saveStadiumMapConfigAction(formData: FormData) {
  const parsed = stadiumMapConfigSaveSchema.safeParse({
    stadiumId: formData.get("stadiumId"),
    mapKey: formData.get("mapKey"),
    configJson: formData.get("configJson"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminStadiumMap({
      error: "Cererea de salvare a hartii stadionului este invalida.",
    });
  }

  const input = parsed.data;
  const viewer = await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminStadiumMap({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  let parsedConfig: z.infer<typeof stadiumMapConfigSchema>;

  try {
    parsedConfig = stadiumMapConfigSchema.parse(JSON.parse(input.configJson));
  } catch (error) {
    console.error("Configuratia JSON pentru harta stadionului este invalida.", error);
    redirectToAdminStadiumMap({
      error:
        "Configuratia JSON pentru harta stadionului este invalida. Verifica structura shape-urilor si viewBox-ul.",
    });
  }

  if (parsedConfig.mapKey !== input.mapKey) {
    parsedConfig = {
      ...parsedConfig,
      mapKey: input.mapKey,
    };
  }

  await supabase.from("stadium_map_configs").upsert(
    {
      stadium_id: input.stadiumId,
      map_key: input.mapKey,
      config: parsedConfig,
      is_active: true,
    },
    {
      onConflict: "stadium_id",
    },
  );

  await logAudit(viewer.userId, "save_stadium_map_config", "stadium_map_configs", input.stadiumId, {
    mapKey: input.mapKey,
  });

  revalidatePath("/admin/stadion");
  revalidatePath("/admin/stadion/harta");
  redirectToAdminStadiumMap({
    notice: `Configuratia hartii ${parsedConfig.defaultLabel} a fost salvata.`,
  });
}

export async function updateMatchAction(formData: FormData) {
  const viewer = await ensureAdmin();
  const ticketPriceResult = parseLeiAmountInput(formData.get("ticketPriceLei"), "Pret");

  if (!ticketPriceResult.ok) {
    redirectToAdminMatches({ error: ticketPriceResult.message });
  }

  const posterUrlResult = await resolveMatchMediaUrl(
    formData,
    "posterFile",
    "posterUrl",
    String(formData.get("slug") ?? ""),
    "poster",
  );
  if (!posterUrlResult.ok) {
    redirectToAdminMatches({ error: posterUrlResult.message });
  }

  const bannerUrlResult = await resolveMatchMediaUrl(
    formData,
    "bannerFile",
    "bannerUrl",
    String(formData.get("slug") ?? ""),
    "banner",
  );
  if (!bannerUrlResult.ok) {
    redirectToAdminMatches({ error: bannerUrlResult.message });
  }

  const parsed = matchUpdateSchema.safeParse({
    matchId: formData.get("matchId"),
    stadiumId: formData.get("stadiumId"),
    homeTeam: formData.get("homeTeam"),
    awayTeam: formData.get("awayTeam"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    competitionName: formData.get("competitionName"),
    startsAt: getDateTimeValueFromFormData(
      formData,
      "startsAt",
      "startsAtDate",
      "startsAtTime",
    ),
    posterUrl: posterUrlResult.url || String(formData.get("posterUrl") || ""),
    bannerUrl: bannerUrlResult.url || String(formData.get("bannerUrl") || ""),
    status: formData.get("status"),
    maxTicketsPerUser: formData.get("maxTicketsPerUser"),
    reservationOpensAt:
      getDateTimeValueFromFormData(
        formData,
        "reservationOpensAt",
        "reservationOpensAtDate",
        "reservationOpensAtTime",
      ) || undefined,
    reservationClosesAt:
      getDateTimeValueFromFormData(
        formData,
        "reservationClosesAt",
        "reservationClosesAtDate",
        "reservationClosesAtTime",
      ) || undefined,
    scannerEnabled: formData.get("scannerEnabled") === "on",
    ticketingMode: formData.get("ticketingMode") || "free",
    ticketPriceCents: ticketPriceResult.cents,
    currency: "MDL",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminMatches({
      error: "Datele meciului nu sunt complete sau nu au format valid.",
    });
  }

  const startsAtResult = normalizeMatchDateTime(parsed.data.startsAt, "Start meci", {
    required: true,
  });
  if (!startsAtResult.ok) {
    redirectToAdminMatches({ error: startsAtResult.message });
  }

  if (!startsAtResult.value) {
    redirectToAdminMatches({ error: "Startul meciului este obligatoriu." });
  }

  const reservationOpensAtResult = normalizeMatchDateTime(
    parsed.data.reservationOpensAt,
    "Deschidere ticketing",
  );
  if (!reservationOpensAtResult.ok) {
    redirectToAdminMatches({ error: reservationOpensAtResult.message });
  }

  const reservationClosesAtResult = normalizeMatchDateTime(
    parsed.data.reservationClosesAt,
    "Inchidere ticketing",
  );
  if (!reservationClosesAtResult.ok) {
    redirectToAdminMatches({ error: reservationClosesAtResult.message });
  }

  const scheduleError = validateMatchScheduleWindow({
    startsAtIso: startsAtResult.value,
    reservationOpensAtIso: reservationOpensAtResult.value,
    reservationClosesAtIso: reservationClosesAtResult.value,
  });

  if (scheduleError) {
    redirectToAdminMatches({ error: scheduleError });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectToAdminMatches({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const organizerId = await getLocationOrganizerId(supabase, parsed.data.stadiumId);

  try {
    await persistTeamsCatalog(supabase, viewer.userId, [
      parsed.data.homeTeam,
      parsed.data.awayTeam,
    ]);
  } catch (error) {
    console.error("Nu am putut sincroniza echipele pentru meci.", error);
    redirectToAdminMatches({
      error: "Catalogul de echipe nu a putut fi actualizat. Incearca din nou.",
    });
  }

  let updateMatchResult = await supabase
    .from("matches")
    .update({
      stadium_id: parsed.data.stadiumId,
      organizer_id: organizerId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      competition_name: parsed.data.competitionName,
      opponent_name: parsed.data.awayTeam,
      starts_at: startsAtResult.value,
      poster_url: parsed.data.posterUrl || null,
      banner_url: parsed.data.bannerUrl || null,
      status: parsed.data.status,
      scanner_enabled: parsed.data.scannerEnabled,
      updated_by: viewer.userId,
    })
    .eq("id", parsed.data.matchId);

  if (updateMatchResult.error && isOptionalSchemaError(updateMatchResult.error)) {
    updateMatchResult = await supabase
      .from("matches")
      .update({
        stadium_id: parsed.data.stadiumId,
        title: parsed.data.title,
        slug: parsed.data.slug,
        competition_name: parsed.data.competitionName,
        opponent_name: parsed.data.awayTeam,
        starts_at: startsAtResult.value,
        poster_url: parsed.data.posterUrl || null,
        banner_url: parsed.data.bannerUrl || null,
        status: parsed.data.status,
        scanner_enabled: parsed.data.scannerEnabled,
        updated_by: viewer.userId,
      })
      .eq("id", parsed.data.matchId);
  }

  const { error: updateError } = updateMatchResult;

  if (updateError) {
    console.error("Nu am putut actualiza meciul.", updateError);
    redirectToAdminMatches({
      error:
        sanitizeUserFacingErrorMessage(
          updateError.message,
          "Meciul nu a putut fi actualizat. Verifica datele si incearca din nou.",
        ) ??
        "Meciul nu a putut fi actualizat. Verifica datele si incearca din nou.",
    });
  }

  const { error: settingsError } = await supabase.from("match_settings").upsert(
    {
      match_id: parsed.data.matchId,
      max_tickets_per_user: parsed.data.maxTicketsPerUser,
      opens_at: reservationOpensAtResult.value,
      closes_at: reservationClosesAtResult.value,
      ticketing_mode: parsed.data.ticketingMode,
      ticket_price_cents:
        parsed.data.ticketingMode === "paid" ? parsed.data.ticketPriceCents : 0,
      currency: "MDL",
    },
    {
      onConflict: "match_id",
    },
  );

  if (settingsError) {
    console.error("Nu am putut actualiza setarile meciului.", settingsError);
    redirectToAdminMatches({
      error:
        sanitizeUserFacingErrorMessage(
          settingsError.message,
          "Setarile meciului nu au putut fi actualizate. Incearca din nou.",
        ) ??
        "Setarile meciului nu au putut fi actualizate. Incearca din nou.",
    });
  }

  await logAudit(viewer.userId, "update_match", "matches", parsed.data.matchId, {
    ...parsed.data,
    startsAt: startsAtResult.value,
    reservationOpensAt: reservationOpensAtResult.value,
    reservationClosesAt: reservationClosesAtResult.value,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/meciuri");
  redirectToAdminMatches({
    notice: `Meciul ${parsed.data.title} a fost actualizat.`,
  });
}

export async function deleteMatchAction(formData: FormData) {
  const parsed = matchDeleteSchema.safeParse({
    matchId: formData.get("matchId"),
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminMatches({
      error: "Cererea de stergere a meciului este invalida.",
    });
  }

  const input = parsed.data;
  await ensureAdmin();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectToAdminMatches({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, title")
    .eq("id", input.matchId)
    .maybeSingle();

  if (!match) {
    redirectToAdminMatches({
      error: "Meciul nu mai exista sau a fost deja sters.",
    });
  }

  const { data: deleteSummary, error } = await supabase.rpc("admin_delete_match_cascade", {
    p_match_id: input.matchId,
  });

  if (error) {
    console.error("Stergerea extinsa a meciului a esuat.", error);
    redirectToAdminMatches({
      error:
        "Meciul nu a putut fi sters complet. Verifica dependintele lui sau incearca din nou.",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/meciuri");
  redirectToAdminMatches({
    notice: `Meciul ${match.title} a fost sters. Au fost eliminate ${Number((deleteSummary as { deletedReservations?: number } | null)?.deletedReservations ?? 0)} rezervari, ${Number((deleteSummary as { deletedTickets?: number } | null)?.deletedTickets ?? 0)} bilete, ${Number((deleteSummary as { deletedScans?: number } | null)?.deletedScans ?? 0)} scanari si ${Number((deleteSummary as { deletedPayments?: number } | null)?.deletedPayments ?? 0)} plati asociate.`,
  });
}

export async function applyMatchSeatOverrideAction(
  input: z.input<typeof matchSeatOverrideApplySchema>,
) {
  const viewer = await ensureAdmin();
  const parsed = matchSeatOverrideApplySchema.safeParse(input);

  if (!parsed.success || !isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Date invalide pentru override-ul de loc.",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Conexiunea la baza de date nu este disponibila.",
    };
  }

  const seatIds = Array.from(new Set(parsed.data.seatIds));
  const expiresAt =
    parsed.data.status === "admin_hold"
      ? parsed.data.expiresAt?.trim()
      : undefined;

  if (parsed.data.status === "admin_hold" && !expiresAt) {
    return {
      ok: false,
      message: "Alege pana cand ramane activ hold-ul administrativ.",
    };
  }

  const expiresAtIso =
    parsed.data.status === "admin_hold" && expiresAt
      ? new Date(expiresAt).toISOString()
      : null;

  if (
    parsed.data.status === "admin_hold" &&
    (!expiresAtIso || Number.isNaN(new Date(expiresAtIso).getTime()) || new Date(expiresAtIso) <= new Date())
  ) {
    return {
      ok: false,
      message: "Data de expirare pentru hold trebuie sa fie in viitor.",
    };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, slug, title, stadium_id")
    .eq("id", parsed.data.matchId)
    .maybeSingle();

  if (!match) {
    return {
      ok: false,
      message: "Meciul nu mai exista.",
    };
  }

  const { data: seatRows } = await supabase
    .from("seats")
    .select(
      `
        id,
        seat_label,
        row_label,
        seat_number,
        stadium_sectors!inner (
          id,
          stadium_id,
          name,
          code
        )
      `,
    )
    .in("id", seatIds);

  const seats = (seatRows ?? []) as Array<{
    id: string;
    seat_label?: string | null;
    row_label?: string | null;
    seat_number?: number | null;
    stadium_sectors?:
      | {
          id?: string | null;
          stadium_id?: string | null;
          name?: string | null;
          code?: string | null;
        }
      | Array<{
          id?: string | null;
          stadium_id?: string | null;
          name?: string | null;
          code?: string | null;
        }>
      | null;
  }>;

  const normalizedSeats = seats.filter((seat) => {
    const sector = Array.isArray(seat.stadium_sectors)
      ? seat.stadium_sectors[0]
      : seat.stadium_sectors;

    return sector?.stadium_id === match.stadium_id;
  });

  if (normalizedSeats.length !== seatIds.length) {
    return {
      ok: false,
      message:
        "Unele locuri selectate nu apartin stadionului acestui meci sau nu mai exista.",
    };
  }

  const nowIso = new Date().toISOString();
  const [{ count: activeTicketCount }, { count: activeUserHoldCount }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("match_id", parsed.data.matchId)
      .in("seat_id", seatIds)
      .in("status", ["active", "used", "blocked"]),
    supabase
      .from("seat_holds")
      .select("id", { count: "exact", head: true })
      .eq("match_id", parsed.data.matchId)
      .in("seat_id", seatIds)
      .eq("status", "active")
      .gt("expires_at", nowIso),
  ]);

  if ((activeTicketCount ?? 0) > 0) {
    return {
      ok: false,
      message:
        "Unele locuri au deja bilete emise sau validate pentru acest meci si nu mai pot fi suprascrise.",
    };
  }

  if ((activeUserHoldCount ?? 0) > 0) {
    return {
      ok: false,
      message:
        "Unele locuri au hold-uri active. Elibereaza-le sau asteapta expirarea lor inainte de override.",
    };
  }

  const payload = seatIds.map((seatId) => ({
    match_id: parsed.data.matchId,
    seat_id: seatId,
    status: parsed.data.status,
    expires_at: expiresAtIso,
    note: parsed.data.note?.trim() || null,
    created_by: viewer.userId,
  }));

  const { error } = await supabase.from("match_seat_overrides").upsert(payload, {
    onConflict: "match_id,seat_id",
  });

  if (error) {
    console.error("Nu am putut salva override-urile per meci.", error);
    return {
      ok: false,
      message: "Override-ul nu a putut fi salvat. Incearca din nou.",
    };
  }

  await logAudit(viewer.userId, "apply_match_seat_override", "matches", parsed.data.matchId, {
    seatIds,
    status: parsed.data.status,
    expiresAt: expiresAtIso,
    note: parsed.data.note?.trim() || null,
  });

  revalidatePath(`/admin/meciuri/${parsed.data.matchId}`);
  revalidatePath(`/meciuri/${match.slug}`);
  revalidatePath(`/meciuri/${match.slug}/rezerva`);

  return {
    ok: true,
    message:
      parsed.data.status === "blocked"
        ? `Ai blocat ${seatIds.length} locuri pentru acest meci.`
        : `Ai pus hold administrativ pe ${seatIds.length} locuri pana la ${new Date(expiresAtIso ?? nowIso).toLocaleString("ro-RO")}.`,
  };
}

export async function releaseMatchSeatOverrideAction(
  input: z.input<typeof matchSeatOverrideReleaseSchema>,
) {
  const viewer = await ensureAdmin();
  const parsed = matchSeatOverrideReleaseSchema.safeParse(input);

  if (!parsed.success || !isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Date invalide pentru eliberarea override-ului.",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Conexiunea la baza de date nu este disponibila.",
    };
  }

  const seatIds = Array.from(new Set(parsed.data.seatIds));
  const { data: match } = await supabase
    .from("matches")
    .select("id, slug")
    .eq("id", parsed.data.matchId)
    .maybeSingle();

  if (!match) {
    return {
      ok: false,
      message: "Meciul nu mai exista.",
    };
  }

  const { error, count } = await supabase
    .from("match_seat_overrides")
    .delete({ count: "exact" })
    .eq("match_id", parsed.data.matchId)
    .in("seat_id", seatIds);

  if (error) {
    console.error("Nu am putut elibera override-urile per meci.", error);
    return {
      ok: false,
      message: "Locurile nu au putut fi eliberate. Incearca din nou.",
    };
  }

  await logAudit(viewer.userId, "release_match_seat_override", "matches", parsed.data.matchId, {
    seatIds,
    releasedCount: count ?? 0,
  });

  revalidatePath(`/admin/meciuri/${parsed.data.matchId}`);
  revalidatePath(`/meciuri/${match.slug}`);
  revalidatePath(`/meciuri/${match.slug}/rezerva`);

  return {
    ok: true,
    message:
      count && count > 0
        ? `Ai eliberat ${count} override-uri pentru acest meci.`
        : "Nu existau override-uri active pe locurile selectate.",
  };
}

export async function saveMatchSectorPricingAction(
  input: z.input<typeof matchSectorPricingSaveSchema>,
) {
  const viewer = await ensureAdmin();
  const parsed = matchSectorPricingSaveSchema.safeParse(input);

  if (!parsed.success || !isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Date invalide pentru configurarea preturilor pe sectoare.",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Conexiunea la baza de date nu este disponibila.",
    };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, slug, stadium_id")
    .eq("id", parsed.data.matchId)
    .maybeSingle();

  if (!match) {
    return {
      ok: false,
      message: "Meciul nu mai exista.",
    };
  }

  const sectorIds = Array.from(new Set(parsed.data.pricing.map((item) => item.sectorId)));

  const { data: sectors, error: sectorError } = await supabase
    .from("stadium_sectors")
    .select("id")
    .eq("stadium_id", match.stadium_id)
    .in("id", sectorIds);

  if (sectorError) {
    console.error("Nu am putut verifica sectoarele meciului.", sectorError);
    return {
      ok: false,
      message: "Sectoarele nu au putut fi validate.",
    };
  }

  const allowedSectorIds = new Set((sectors ?? []).map((sector) => String(sector.id)));

  if (allowedSectorIds.size !== sectorIds.length) {
    return {
      ok: false,
      message: "Unele sectoare nu apartin stadionului asociat acestui meci.",
    };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("match_sector_overrides")
    .select("id, sector_id")
    .eq("match_id", parsed.data.matchId)
    .in("sector_id", sectorIds);

  if (existingError) {
    console.error("Nu am putut incarca override-urile existente pe sectoare.", existingError);
    return {
      ok: false,
      message: "Preturile existente pe sectoare nu au putut fi incarcate.",
    };
  }

  const existingBySector = new Map(
    (existingRows ?? []).map((row) => [String(row.sector_id), String(row.id)]),
  );

  for (const item of parsed.data.pricing) {
    const existingId = existingBySector.get(item.sectorId);

    if (existingId) {
      const { error } = await supabase
        .from("match_sector_overrides")
        .update({
          ticket_price_cents_override: item.ticketPriceCentsOverride,
        })
        .eq("id", existingId);

      if (error) {
        console.error("Nu am putut actualiza pretul pe sector.", error);
        return {
          ok: false,
          message: "Unul dintre preturile pe sector nu a putut fi actualizat.",
        };
      }

      continue;
    }

    if (item.ticketPriceCentsOverride === null) {
      continue;
    }

    const { error } = await supabase.from("match_sector_overrides").insert({
      match_id: parsed.data.matchId,
      sector_id: item.sectorId,
      ticket_price_cents_override: item.ticketPriceCentsOverride,
    });

    if (error) {
      console.error("Nu am putut salva pretul pe sector.", error);
      return {
        ok: false,
        message: "Unul dintre preturile pe sector nu a putut fi salvat.",
      };
    }
  }

  await logAudit(viewer.userId, "save_match_sector_pricing", "matches", parsed.data.matchId, {
    pricing: parsed.data.pricing,
  });

  revalidatePath(`/admin/meciuri/${parsed.data.matchId}`);
  revalidatePath("/admin/meciuri");
  revalidatePath(`/meciuri/${match.slug}`);
  revalidatePath(`/meciuri/${match.slug}/rezerva`);
  revalidatePath(`/meciuri/${match.slug}/checkout`);

  return {
    ok: true,
    message: "Preturile pe sectoare au fost salvate.",
  };
}

export async function createManagedUserAction(formData: FormData) {
  const viewer = await ensureAdmin();

  if (!viewer.roles.includes("superadmin")) {
    redirectToAdminUsers({
      error: "Doar superadmin poate crea utilizatori si atribui roluri.",
    });
  }

  const parsed = managedUserCreateSchema.safeParse({
    email: formData.get("email") || "",
    password: formData.get("password") || "",
    fullName: formData.get("fullName") || "",
    role: formData.get("role") || "user",
    canReserve: formData.get("canReserve") ? "true" : "false",
    phone: formData.get("phone") || "",
    contactEmail: formData.get("contactEmail") || "",
    locality: formData.get("locality") || "",
    district: formData.get("district") || "",
    birthDate: formData.get("birthDate") || "",
    gender: formData.get("gender") || "unspecified",
    preferredLanguage: formData.get("preferredLanguage") || "ro",
    marketingOptIn: formData.get("marketingOptIn") ? "true" : "false",
    smsOptIn: formData.get("smsOptIn") ? "true" : "false",
  });

  if (!parsed.success) {
    redirectToAdminUsers({
      error: "Verifica emailul, parola si campurile profilului. Parola trebuie sa aiba minimum 8 caractere.",
    });
  }

  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    redirectToAdminUsers({
      error: "Crearea utilizatorilor necesita SUPABASE_SERVICE_ROLE_KEY setat in Vercel ca variabila server-side.",
    });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    redirectToAdminUsers({
      error: "Clientul Supabase Admin nu a putut fi initializat.",
    });
  }

  const fullName =
    parsed.data.fullName ||
    parsed.data.email.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Utilizator";
  const contactEmail = parsed.data.contactEmail || parsed.data.email;

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        preferred_language: parsed.data.preferredLanguage,
      },
    });

  if (authError || !authData.user) {
    redirectToAdminUsers({
      error:
        authError?.message === "A user with this email address has already been registered"
          ? "Exista deja un utilizator cu acest email."
          : `Utilizatorul nu a putut fi creat: ${sanitizeUserFacingErrorMessage(authError?.message, "eroare necunoscuta")}`,
    });
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      email: parsed.data.email,
      contact_email: contactEmail,
      full_name: fullName,
      phone: parsed.data.phone || null,
      locality: parsed.data.locality || null,
      district: parsed.data.district || null,
      birth_date: parsed.data.birthDate || null,
      gender: parsed.data.gender,
      preferred_language: parsed.data.preferredLanguage,
      marketing_opt_in: parsed.data.marketingOptIn,
      sms_opt_in: parsed.data.smsOptIn,
      can_reserve: parsed.data.canReserve,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    redirectToAdminUsers({
      error: `Profilul utilizatorului nu a putut fi salvat: ${sanitizeUserFacingErrorMessage(profileError.message, "eroare baza de date")}`,
    });
  }

  const { error: deleteRolesError } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  const { error: roleError } = deleteRolesError
    ? { error: deleteRolesError }
    : await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: parsed.data.role,
      });

  if (roleError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    redirectToAdminUsers({
      error: `Rolul utilizatorului nu a putut fi salvat: ${sanitizeUserFacingErrorMessage(roleError.message, "eroare baza de date")}`,
    });
  }

  await logAudit(viewer.userId, "create_managed_user", "profiles", userId, {
    email: parsed.data.email,
    role: parsed.data.role,
    canReserve: parsed.data.canReserve,
    createdByAdmin: true,
  });

  revalidatePath("/admin/utilizatori");

  redirectToAdminUsers({
    notice: `Utilizatorul ${parsed.data.email} a fost creat cu rolul selectat.`,
  });
}

export async function deleteManagedUserAction(formData: FormData) {
  const viewer = await ensureAdmin();

  if (!viewer.roles.includes("superadmin")) {
    redirectToAdminUsers({
      error: "Doar superadmin poate sterge utilizatori.",
    });
  }

  const parsed = managedUserDeleteSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    redirectToAdminUsers({
      error: "Utilizatorul selectat nu este valid.",
    });
  }

  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    redirectToAdminUsers({
      error:
        "Stergerea utilizatorilor necesita SUPABASE_SERVICE_ROLE_KEY setat in Vercel ca variabila server-side.",
    });
  }

  if (parsed.data.userId === viewer.userId) {
    redirectToAdminUsers({
      error: "Nu iti poti sterge propriul cont din panoul de administrare.",
    });
  }

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabase || !supabaseAdmin) {
    redirectToAdminUsers({
      error: "Conexiunea administrativa la baza de date nu este disponibila.",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  const userDisplayLabel =
    profile?.full_name?.trim() || profile?.email?.trim() || parsed.data.userId;

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(parsed.data.userId);

  if (deleteError) {
    redirectToAdminUsers({
      error: `Utilizatorul nu a putut fi sters: ${sanitizeUserFacingErrorMessage(deleteError.message, "eroare necunoscuta")}`,
    });
  }

  await logAudit(viewer.userId, "delete_managed_user", "profiles", parsed.data.userId, {
    deletedUserId: parsed.data.userId,
    deletedUserLabel: userDisplayLabel,
  });

  revalidatePath("/admin/utilizatori");
  revalidatePath(`/admin/utilizatori/${parsed.data.userId}`);

  redirectToAdminUsers({
    notice: `Utilizatorul ${userDisplayLabel} a fost sters definitiv.`,
  });
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

export async function saveUserAccessScopeAction(formData: FormData) {
  const viewer = await ensureAdmin();

  if (!viewer.roles.includes("superadmin")) {
    redirectToAdminUsers({
      error: "Doar superadmin poate gestiona scope-urile operationale.",
    });
  }

  const parsed = userAccessScopeSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    organizerId: formData.get("organizerId") || "",
    locationId: formData.get("locationId") || "",
  });

  if (!parsed.success || !isSupabaseConfigured()) {
    redirectToAdminUsers({
      error: "Scope-ul operational nu este valid.",
    });
  }

  if (!parsed.data.organizerId && !parsed.data.locationId) {
    redirectToAdminUsers({
      error: "Selecteaza cel putin un organizator sau o locatie pentru acest scope.",
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectToAdminUsers({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { error } = await supabase.from("user_access_scopes").insert({
    user_id: parsed.data.userId,
    role: parsed.data.role,
    organizer_id: parsed.data.organizerId || null,
    stadium_id: parsed.data.locationId || null,
    created_by: viewer.userId,
  });

  if (error) {
    redirectToAdminUsers({
      error:
        sanitizeUserFacingErrorMessage(
          error.message,
          "Scope-ul operational nu a putut fi salvat.",
        ) ?? "Scope-ul operational nu a putut fi salvat.",
    });
  }

  await logAudit(viewer.userId, "save_user_access_scope", "user_access_scopes", parsed.data.userId, parsed.data);
  revalidatePath("/admin/utilizatori");
  redirectToAdminUsers({
    notice: "Scope-ul operational a fost salvat.",
  });
}

export async function removeUserAccessScopeAction(formData: FormData) {
  const viewer = await ensureAdmin();

  if (!viewer.roles.includes("superadmin")) {
    redirectToAdminUsers({
      error: "Doar superadmin poate sterge scope-urile operationale.",
    });
  }

  const scopeId = String(formData.get("scopeId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!scopeId || !isSupabaseConfigured()) {
    redirectToAdminUsers({
      error: "Scope-ul selectat nu este valid.",
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectToAdminUsers({
      error: "Conexiunea la baza de date nu este disponibila.",
    });
  }

  const { error } = await supabase.from("user_access_scopes").delete().eq("id", scopeId);

  if (error) {
    redirectToAdminUsers({
      error:
        sanitizeUserFacingErrorMessage(
          error.message,
          "Scope-ul operational nu a putut fi sters.",
        ) ?? "Scope-ul operational nu a putut fi sters.",
    });
  }

  await logAudit(viewer.userId, "remove_user_access_scope", "user_access_scopes", scopeId, {
    userId,
  });
  revalidatePath("/admin/utilizatori");
  redirectToAdminUsers({
    notice: "Scope-ul operational a fost sters.",
  });
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
    stadiumId: formData.get("stadiumId"),
    seatId: formData.get("seatId"),
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

  const { data: seatRow } = await supabase
    .from("seats")
    .select(
      `
        id,
        gate_id,
        stadium_sectors!inner (
          id,
          stadium_id,
          gate_id
        )
      `,
    )
    .eq("id", parsed.data.seatId)
    .maybeSingle();

  const seat = seatRow as {
    id?: string | null;
    gate_id?: string | null;
    stadium_sectors?:
      | {
          id?: string | null;
          stadium_id?: string | null;
          gate_id?: string | null;
        }
      | Array<{
          id?: string | null;
          stadium_id?: string | null;
          gate_id?: string | null;
        }>
      | null;
  } | null;

  const seatSector = Array.isArray(seat?.stadium_sectors)
    ? seat?.stadium_sectors[0]
    : seat?.stadium_sectors;

  if (!seat?.id || !seatSector?.stadium_id || seatSector.stadium_id !== parsed.data.stadiumId) {
    throw new Error("Locul ales nu apartine stadionului selectat pentru abonament.");
  }

  const { count: overlappingCount } = await supabase
    .from("user_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("seat_id", parsed.data.seatId)
    .eq("stadium_id", parsed.data.stadiumId)
    .eq("status", "active")
    .lte("starts_at", endsAt.toISOString())
    .gte("ends_at", startsAt.toISOString());

  if ((overlappingCount ?? 0) > 0) {
    throw new Error(
      "Locul ales are deja un alt abonament activ sau suprapus in perioada selectata.",
    );
  }

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
      stadium_id: parsed.data.stadiumId,
      seat_id: parsed.data.seatId,
      gate_id: seat.gate_id ?? seatSector.gate_id ?? null,
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
