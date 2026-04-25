import "server-only";

import { hasAnyRole, normalizeRoles } from "@/lib/auth/roles";
import {
  adminMatchOverviewSchema,
  adminUserOverviewSchema,
  profileDetailsSchema,
  publicMatchSchema,
  seatMapSeatSchema,
  ticketCardSchema,
  type AdminMatchOverview,
  type AdminUserOverview,
  type CheckoutSummary,
  type ProfileDetails,
  type PublicMatch,
  type ScannerMatch,
  type SeatMapSector,
  type StadiumBuilder,
  type StadiumSponsor,
  type TeamOption,
  type TicketCard,
  type UserSubscription,
  type ViewerContext,
  checkoutSummarySchema,
  teamOptionSchema,
  userSubscriptionSchema,
} from "@/lib/domain/types";
import { stadiumMapConfigSchema } from "@/lib/stadium/stadium-schema";
import type { StadiumMapConfig } from "@/lib/stadium/stadium-types";
import {
  mockAdminMatches,
  mockAdminUsers,
  mockMatches,
  mockScannerMatches,
  mockSeatMap,
  mockTickets,
  mockViewer,
} from "@/lib/domain/mock";
import { isSupabaseConfigured } from "@/lib/env";
import {
  createSupabasePublicServerClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

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

function enrichViewer(
  base: Omit<ViewerContext, "isAdmin" | "isAuthenticated" | "isPrivileged">,
): ViewerContext {
  const roles = normalizeRoles(base.roles);

  return {
    ...base,
    roles,
    isAuthenticated: Boolean(base.userId),
    isPrivileged: hasAnyRole(roles, ["organizer_admin", "admin", "superadmin"]),
    isAdmin: hasAnyRole(roles, ["organizer_admin", "admin", "superadmin"]),
  };
}

function hasScopedOperationsAccess(viewer: ViewerContext) {
  return hasAnyRole(viewer.roles, ["steward", "organizer_admin"]);
}

function isGlobalAdmin(viewer: ViewerContext) {
  return hasAnyRole(viewer.roles, ["admin", "superadmin"]);
}

function canAccessLocation(
  viewer: ViewerContext,
  locationId: string | null | undefined,
  organizerId: string | null | undefined,
) {
  if (!locationId) {
    return false;
  }

  if (isGlobalAdmin(viewer)) {
    return true;
  }

  if (!hasScopedOperationsAccess(viewer)) {
    return false;
  }

  if (viewer.locationIds.includes(locationId)) {
    return true;
  }

  return Boolean(organizerId && viewer.organizerIds.includes(organizerId));
}

export async function getViewerContext(): Promise<ViewerContext> {
  if (!isSupabaseConfigured()) {
    return mockViewer;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return mockViewer;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    let resolvedUser = user;

    if (!resolvedUser) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      resolvedUser = session?.user ?? null;
    }

    if (!resolvedUser) {
      if (userError) {
        console.error("Nu am putut valida utilizatorul autentificat pe server.", userError);
      }
      return mockViewer;
    }

    const [{ data: profile }, { data: roles }, { data: block }, { data: scopes }] =
      await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, can_reserve")
        .eq("id", resolvedUser.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", resolvedUser.id),
      supabase
        .from("user_blocks")
        .select("type, ends_at, reason")
        .eq("user_id", resolvedUser.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
        supabase
          .from("user_access_scopes")
          .select("organizer_id, stadium_id")
          .eq("user_id", resolvedUser.id),
      ]);

    const profileRecord = profile as {
      full_name?: string | null;
      can_reserve?: boolean | null;
    } | null;
    const roleRows = (roles ?? []) as Array<{ role: string }>;
    const scopeRows = (scopes ?? []) as Array<{
      organizer_id?: string | null;
      stadium_id?: string | null;
    }>;
    const activeBlock = block as { ends_at?: string | null; reason?: string | null } | null;

    return enrichViewer({
      userId: resolvedUser.id,
      email: resolvedUser.email ?? null,
      fullName: profileRecord?.full_name ?? null,
      canReserve: Boolean(profileRecord?.can_reserve),
      roles: normalizeRoles(roleRows.map((item) => item.role)),
      organizerIds: Array.from(
        new Set(
          scopeRows
            .map((item) => item.organizer_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
      locationIds: Array.from(
        new Set(
          scopeRows
            .map((item) => item.stadium_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
      reservationBlockedUntil: activeBlock?.ends_at ?? null,
      reservationBlockReason: activeBlock?.reason ?? null,
    });
  } catch (error) {
    console.error("Nu am putut încărca contextul utilizatorului.", error);
    return mockViewer;
  }
}

function parseProfileDetails(row: Record<string, unknown>) {
  return profileDetailsSchema.parse({
    userId: row.id,
    email: row.email,
    contactEmail: row.contact_email,
    fullName: row.full_name,
    phone: row.phone,
    locality: row.locality,
    district: row.district,
    birthDate: row.birth_date,
    gender: row.gender,
    preferredLanguage: row.preferred_language,
    marketingOptIn: row.marketing_opt_in,
    smsOptIn: row.sms_opt_in,
    canReserve: row.can_reserve,
  });
}

export async function getViewerProfileDetails(
  viewer: ViewerContext,
): Promise<ProfileDetails | null> {
  if (!viewer.userId || !isSupabaseConfigured()) {
    return viewer.userId
      ? profileDetailsSchema.parse({
          userId: viewer.userId,
          email: viewer.email,
          contactEmail: viewer.email,
          fullName: viewer.fullName,
          phone: null,
          locality: null,
          district: null,
          birthDate: null,
          gender: "unspecified",
          preferredLanguage: "ro",
          marketingOptIn: false,
          smsOptIn: false,
          canReserve: viewer.canReserve,
        })
      : null;
  }

  try {
    const viewer = await getViewerContext();
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, contact_email, full_name, phone, locality, district, birth_date, gender, preferred_language, marketing_opt_in, sms_opt_in, can_reserve",
      )
      .eq("id", viewer.userId)
      .maybeSingle();

    if (error || !data) {
      throw error;
    }

    return parseProfileDetails(data as Record<string, unknown>);
  } catch (error) {
    console.error("Nu am putut incarca profilul complet al utilizatorului.", error);
    return null;
  }
}

export async function getAdminUserProfileDetails(userId: string): Promise<ProfileDetails | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, contact_email, full_name, phone, locality, district, birth_date, gender, preferred_language, marketing_opt_in, sms_opt_in, can_reserve",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      throw error;
    }

    return parseProfileDetails(data as Record<string, unknown>);
  } catch (error) {
    console.error("Nu am putut incarca profilul CRM al utilizatorului.", error);
    return null;
  }
}

export async function getPublicMatches(): Promise<PublicMatch[]> {
  if (!isSupabaseConfigured()) {
    return mockMatches;
  }

  try {
    const supabase = createSupabasePublicServerClient();

    if (!supabase) {
      return mockMatches;
    }

    const { data, error } = await supabase
      .from("public_match_cards")
      .select("*")
      .order("starts_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    if (!rows.length) {
      return mockMatches;
    }

    return rows.map((item) =>
      publicMatchSchema.parse({
        id: item.id,
        stadiumId: item.stadium_id,
        slug: item.slug,
        title: item.title,
        competitionName: item.competition_name,
        opponentName: item.opponent_name,
        stadiumName: item.stadium_name,
        city: item.city,
        description: item.description,
        posterUrl: item.poster_url,
        bannerUrl: item.banner_url,
        startsAt: item.starts_at,
        status: item.status,
        maxTicketsPerUser: item.max_tickets_per_user,
        reservationOpensAt: item.reservation_opens_at,
        reservationClosesAt: item.reservation_closes_at,
        issuedCount: item.issued_count,
        scannedCount: item.scanned_count,
        availableEstimate: item.available_estimate,
        scannerEnabled: item.scanner_enabled,
        ticketingMode: item.ticketing_mode,
        ticketPriceCents: item.ticket_price_cents,
        currency: item.currency,
      }),
    );
  } catch (error) {
    console.error("Nu am putut încărca lista de meciuri publice.", error);
    return mockMatches;
  }
}

export async function getPublicMatchBySlug(slug: string) {
  const matches = await getPublicMatches();
  return matches.find((match) => match.slug === slug) ?? null;
}

export async function getSeatMapForMatch(
  matchId: string,
  viewer: ViewerContext = mockViewer,
): Promise<SeatMapSector[]> {
  if (!isSupabaseConfigured()) {
    return mockSeatMap;
  }

  try {
    const supabase = viewer.userId
      ? await createSupabaseServerClient()
      : createSupabasePublicServerClient();

    if (!supabase) {
      return mockSeatMap;
    }

    const pageSize = 1000;
    const rows: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .rpc("get_match_seat_status", {
          p_match_id: matchId,
        })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      const chunk = (data ?? []) as Record<string, unknown>[];
      rows.push(...chunk);

      if (chunk.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    rows.sort((left, right) => {
      const sectorOrder = Number(left.sector_sort_order ?? 0) - Number(right.sector_sort_order ?? 0);
      if (sectorOrder !== 0) {
        return sectorOrder;
      }

      const rowOrder = Number(left.row_sort_order ?? 0) - Number(right.row_sort_order ?? 0);
      if (rowOrder !== 0) {
        return rowOrder;
      }

      return Number(left.seat_number ?? 0) - Number(right.seat_number ?? 0);
    });

    const seats = rows.map((item) =>
      seatMapSeatSchema.parse({
        seatId: item.seat_id,
        sectorId: item.sector_id,
        sectorCode: item.sector_code,
        sectorName: item.sector_name,
        sectorColor: item.sector_color,
        rowLabel: item.row_label,
        seatNumber: item.seat_number,
        seatLabel: item.seat_label,
        availability: item.availability_state,
        holdExpiresAt: item.hold_expires_at,
        heldByCurrentUser: Boolean(item.held_by_current_user),
        gateName: item.gate_name,
        ticketPriceCents: item.effective_ticket_price_cents,
        currency: item.currency,
      }),
    );

    const grouped = seats.reduce<Map<string, SeatMapSector>>((map, seat) => {
      const existing = map.get(seat.sectorId);

      if (existing) {
        existing.seats.push(seat);
        return map;
      }

      map.set(seat.sectorId, {
        sectorId: seat.sectorId,
        code: seat.sectorCode,
        name: seat.sectorName,
        color: seat.sectorColor,
        seats: [seat],
      });

      return map;
    }, new Map());

    return Array.from(grouped.values());
  } catch (error) {
    console.error("Nu am putut încărca harta locurilor.", error);
    return mockSeatMap;
  }
}

export async function getViewerTickets(viewer: ViewerContext): Promise<TicketCard[]> {
  if (!viewer.userId) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return mockTickets;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return mockTickets;
    }

    const { data, error } = await supabase
      .from("ticket_delivery_view")
      .select("*")
      .eq("user_id", viewer.userId)
      .order("starts_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    return rows.map((item) =>
      ticketCardSchema.parse({
        ticketId: item.ticket_id,
        reservationId: item.reservation_id,
        matchId: item.match_id,
        stadiumId: item.stadium_id,
        matchSlug: item.match_slug,
        ticketCode: item.ticket_code,
        status: item.ticket_status,
        source: item.source,
        qrTokenVersion: item.qr_token_version,
        issuedAt: item.issued_at,
        usedAt: item.used_at,
        matchTitle: item.match_title,
        competitionName: item.competition_name,
        opponentName: item.opponent_name,
        startsAt: item.starts_at,
        stadiumName: item.stadium_name,
        sectorName: item.sector_name,
        sectorCode: item.sector_code,
        sectorColor: item.sector_color,
        rowLabel: item.row_label,
        seatNumber: item.seat_number,
        seatLabel: item.seat_label,
        gateName: item.gate_name,
        purchaserName: item.purchaser_name,
        purchaserEmail: item.purchaser_email,
      }),
    );
  } catch (error) {
    console.error("Nu am putut încărca biletele utilizatorului.", error);
    return mockTickets;
  }
}

export async function getTicketByCode(ticketCode: string, viewer: ViewerContext) {
  const tickets = viewer.userId ? await getViewerTickets(viewer) : mockTickets;
  const directMatch = tickets.find((ticket) => ticket.ticketCode === ticketCode);

  if (directMatch) {
    return directMatch;
  }

  if (!viewer.isAdmin || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("ticket_delivery_view")
      .select("*")
      .eq("ticket_code", ticketCode)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return ticketCardSchema.parse({
      ticketId: data.ticket_id,
      reservationId: data.reservation_id,
      matchId: data.match_id,
      stadiumId: data.stadium_id,
      matchSlug: data.match_slug,
      ticketCode: data.ticket_code,
      status: data.ticket_status,
      source: data.source,
      qrTokenVersion: data.qr_token_version,
      issuedAt: data.issued_at,
      usedAt: data.used_at,
      matchTitle: data.match_title,
      competitionName: data.competition_name,
      opponentName: data.opponent_name,
      startsAt: data.starts_at,
      stadiumName: data.stadium_name,
      sectorName: data.sector_name,
      sectorCode: data.sector_code,
      sectorColor: data.sector_color,
      rowLabel: data.row_label,
      seatNumber: data.seat_number,
      seatLabel: data.seat_label,
      gateName: data.gate_name,
      purchaserName: data.purchaser_name,
      purchaserEmail: data.purchaser_email,
    });
  } catch (error) {
    console.error("Nu am putut încărca biletul solicitat.", error);
    return null;
  }
}

export async function getSubscriptionByCode(
  subscriptionCode: string,
  viewer: ViewerContext,
): Promise<UserSubscription | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!viewer.userId && !viewer.isAdmin) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    let query = supabase
      .from("subscription_delivery_view")
      .select("*")
      .eq("subscription_code", subscriptionCode)
      .limit(1);

    if (!viewer.isAdmin) {
      query = query.eq("user_id", viewer.userId ?? "");
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as Record<string, unknown>;

    return userSubscriptionSchema.parse({
      id: row.subscription_id,
      userId: row.user_id,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      pricePaidCents: row.price_paid_cents,
      currency: row.currency,
      source: row.source,
      note: row.note,
      subscriptionCode: row.subscription_code,
      qrTokenVersion: row.qr_token_version,
      stadiumId: row.stadium_id,
      stadiumName: row.stadium_name,
      seatId: row.seat_id,
      sectorName: row.sector_name,
      sectorCode: row.sector_code,
      sectorColor: row.sector_color,
      rowLabel: row.row_label,
      seatNumber: row.seat_number,
      seatLabel: row.seat_label,
      gateName: row.gate_name,
      holderName: row.holder_name,
      holderEmail: row.holder_email,
      holderBirthDate: row.holder_birth_date,
      product: {
        id: row.product_id,
        code: row.product_code,
        name: row.product_name,
        durationType: row.duration_type,
        durationMonths: row.duration_months,
        priceCents: row.product_price_cents,
        currency: row.product_currency,
        description: row.product_description,
        isActive: row.product_is_active,
      },
    });
  } catch (error) {
    console.error("Nu am putut incarca abonamentul solicitat.", error);
    return null;
  }
}

export async function getTicketsByReservationId(
  reservationId: string,
  viewer: ViewerContext,
) {
  if (!isSupabaseConfigured()) {
    return mockTickets.filter((ticket) => ticket.reservationId === reservationId);
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const query = supabase
      .from("ticket_delivery_view")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("seat_number", { ascending: true });

    const { data, error } = viewer.isAdmin
      ? await query
      : await query.eq("user_id", viewer.userId ?? "");

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    return rows.map((item) =>
      ticketCardSchema.parse({
        ticketId: item.ticket_id,
        reservationId: item.reservation_id,
        matchId: item.match_id,
        stadiumId: item.stadium_id,
        matchSlug: item.match_slug,
        ticketCode: item.ticket_code,
        status: item.ticket_status,
        source: item.source,
        qrTokenVersion: item.qr_token_version,
        issuedAt: item.issued_at,
        usedAt: item.used_at,
        matchTitle: item.match_title,
        competitionName: item.competition_name,
        opponentName: item.opponent_name,
        startsAt: item.starts_at,
        stadiumName: item.stadium_name,
        sectorName: item.sector_name,
        sectorCode: item.sector_code,
        sectorColor: item.sector_color,
        rowLabel: item.row_label,
        seatNumber: item.seat_number,
        seatLabel: item.seat_label,
        gateName: item.gate_name,
        purchaserName: item.purchaser_name,
        purchaserEmail: item.purchaser_email,
      }),
    );
  } catch (error) {
    console.error("Nu am putut încărca biletele rezervării.", error);
    return [];
  }
}

export async function getAdminMatchOverview(): Promise<AdminMatchOverview[]> {
  if (!isSupabaseConfigured()) {
    return mockAdminMatches;
  }

  try {
    const viewer = await getViewerContext();
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return mockAdminMatches;
    }

    const { data, error } = await supabase
      .from("match_admin_overview")
      .select("*")
      .order("starts_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    if (!rows.length) {
      return mockAdminMatches;
    }

    let matchMediaById = new Map<
      string,
      {
        organizerId: string | null;
        posterUrl: string | null;
        bannerUrl: string | null;
      }
    >();

    const matchIds = rows
      .map((item) => String(item.id ?? ""))
      .filter(Boolean);

    if (matchIds.length) {
      const { data: directMatches, error: directMatchesError } = await supabase
        .from("matches")
        .select("id, stadium_id, organizer_id, poster_url, banner_url")
        .in("id", matchIds);

      if (directMatchesError && !isOptionalSchemaError(directMatchesError)) {
        throw directMatchesError;
      }

      matchMediaById = new Map(
        ((directMatches ?? []) as Array<{
          id: string;
          organizer_id?: string | null;
          poster_url?: string | null;
          banner_url?: string | null;
        }>).map((item) => [
          item.id,
          {
            organizerId: item.organizer_id ?? null,
            posterUrl: item.poster_url ?? null,
            bannerUrl: item.banner_url ?? null,
          },
        ]),
      );
    }

    const parsedRows = rows.map((item) =>
      adminMatchOverviewSchema.parse({
        id: item.id,
        stadiumId: item.stadium_id,
        slug: item.slug,
        title: item.title,
        competitionName: item.competition_name,
        opponentName: item.opponent_name,
        stadiumName: item.stadium_name,
        posterUrl:
          item.poster_url ??
          matchMediaById.get(String(item.id ?? ""))?.posterUrl ??
          null,
        bannerUrl:
          item.banner_url ??
          matchMediaById.get(String(item.id ?? ""))?.bannerUrl ??
          null,
        startsAt: item.starts_at,
        status: item.status,
        scannerEnabled: item.scanner_enabled,
        maxTicketsPerUser: item.max_tickets_per_user,
        reservationOpensAt: item.reservation_opens_at,
        reservationClosesAt: item.reservation_closes_at,
        issuedCount: item.issued_count,
        scannedCount: item.scanned_count,
        noShowCount: item.no_show_count,
        duplicateScanAttempts: item.duplicate_scan_attempts,
        ticketingMode: item.ticketing_mode,
        ticketPriceCents: item.ticket_price_cents,
        currency: item.currency,
      }),
    );

    if (isGlobalAdmin(viewer) || !hasScopedOperationsAccess(viewer)) {
      return parsedRows;
    }

    return parsedRows.filter((item) =>
      canAccessLocation(
        viewer,
        item.stadiumId,
        matchMediaById.get(item.id)?.organizerId ?? null,
      ),
    );
  } catch (error) {
    console.error("Nu am putut încărca dashboard-ul admin.", error);
    return mockAdminMatches;
  }
}

export async function getAdminUsersOverview(): Promise<AdminUserOverview[]> {
  if (!isSupabaseConfigured()) {
    return mockAdminUsers;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return mockAdminUsers;
    }

    const { data, error } = await supabase
      .from("admin_user_overview")
      .select("*")
      .order("abuse_score", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    if (!rows.length) {
      return mockAdminUsers;
    }

    const needsDerivedDates = rows.some(
      (item) =>
        item.registered_at === undefined ||
        item.last_ticket_issued_at === undefined ||
        item.last_valid_scan_at === undefined,
    );

    let registeredAtByUser = new Map<string, string | null>();
    const lastTicketIssuedAtByUser = new Map<string, string | null>();
    const lastValidScanAtByUser = new Map<string, string | null>();

    if (needsDerivedDates) {
      const userIds = rows
        .map((item) => String(item.user_id ?? ""))
        .filter(Boolean);

      const [profilesResult, ticketsResult, scansResult] = await Promise.all([
        supabase.from("profiles").select("id, created_at").in("id", userIds),
        supabase
          .from("tickets")
          .select("user_id, issued_at")
          .in("user_id", userIds)
          .order("issued_at", { ascending: false }),
        supabase
          .from("ticket_scans")
          .select("scanned_at, tickets!ticket_id(user_id)")
          .eq("result", "valid")
          .order("scanned_at", { ascending: false }),
      ]);

      const profileRows = (profilesResult.data ?? []) as Array<{
        id: string;
        created_at?: string | null;
      }>;
      const ticketRows = (ticketsResult.data ?? []) as Array<{
        user_id?: string | null;
        issued_at?: string | null;
      }>;
      const scanRows = (scansResult.data ?? []) as Array<{
        scanned_at?: string | null;
        tickets?:
          | {
              user_id?: string | null;
            }
          | Array<{
              user_id?: string | null;
            }>
          | null;
      }>;

      registeredAtByUser = new Map(
        profileRows.map((profile) => [String(profile.id), profile.created_at ?? null]),
      );

      for (const ticket of ticketRows) {
        const userId = ticket.user_id ? String(ticket.user_id) : "";

        if (!userId || lastTicketIssuedAtByUser.has(userId)) {
          continue;
        }

        lastTicketIssuedAtByUser.set(userId, ticket.issued_at ?? null);
      }

      for (const scan of scanRows) {
        const ticketRelation = Array.isArray(scan.tickets) ? scan.tickets[0] : scan.tickets;
        const userId = ticketRelation?.user_id ? String(ticketRelation.user_id) : "";

        if (!userId || lastValidScanAtByUser.has(userId)) {
          continue;
        }

        lastValidScanAtByUser.set(userId, scan.scanned_at ?? null);
      }
    }

    return rows.map((item) =>
      adminUserOverviewSchema.parse({
        userId: item.user_id,
        email: item.email,
        fullName: item.full_name,
        roles: item.roles,
        canReserve: item.can_reserve,
        registeredAt:
          item.registered_at ??
          registeredAtByUser.get(String(item.user_id ?? "")) ??
          null,
        totalReserved: item.total_reserved,
        totalScanned: item.total_scanned,
        noShowRatio: item.no_show_ratio,
        abuseScore: item.abuse_score,
        activeBlockType: item.active_block_type,
        activeBlockUntil: item.active_block_until,
        lastTicketIssuedAt:
          item.last_ticket_issued_at ??
          lastTicketIssuedAtByUser.get(String(item.user_id ?? "")) ??
          null,
        lastValidScanAt:
          item.last_valid_scan_at ??
          lastValidScanAtByUser.get(String(item.user_id ?? "")) ??
          null,
      }),
    );
  } catch (error) {
    console.error("Nu am putut încărca lista de utilizatori pentru admin.", error);
    return mockAdminUsers;
  }
}

export async function getOrganizerOptions(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string | null;
    logoUrl: string | null;
  }>
> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const viewer = await getViewerContext();
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("organizers")
      .select("id, name, slug, category, description, logo_url")
      .order("name");

    if (error) {
      throw error;
    }

    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      name: String(item.name),
      slug: String(item.slug),
      category: String(item.category ?? "club"),
      description: item.description ? String(item.description) : null,
      logoUrl: item.logo_url ? String(item.logo_url) : null,
    }));

    if (isGlobalAdmin(viewer) || !hasScopedOperationsAccess(viewer)) {
      return rows;
    }

    return rows.filter((item) => viewer.organizerIds.includes(item.id));
  } catch (error) {
    console.error("Nu am putut incarca lista de organizatori.", error);
    return [];
  }
}

export async function getUserAccessScopeCatalog(): Promise<{
  organizers: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; organizerId: string | null }>;
}> {
  if (!isSupabaseConfigured()) {
    return {
      organizers: [],
      locations: [],
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {
        organizers: [],
        locations: [],
      };
    }

    const [{ data: organizers, error: organizerError }, { data: locations, error: locationError }] =
      await Promise.all([
        supabase.from("organizers").select("id, name").order("name"),
        supabase.from("stadiums").select("id, name, organizer_id").order("name"),
      ]);

    if (organizerError || locationError) {
      throw organizerError ?? locationError;
    }

    return {
      organizers: ((organizers ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        name: String(item.name),
      })),
      locations: ((locations ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        name: String(item.name),
        organizerId: item.organizer_id ? String(item.organizer_id) : null,
      })),
    };
  } catch (error) {
    console.error("Nu am putut incarca catalogul de scope-uri.", error);
    return {
      organizers: [],
      locations: [],
    };
  }
}

export async function getUserAccessScopesByUser(): Promise<
  Record<
    string,
    Array<{
      id: string;
      role: string;
      organizerId: string | null;
      organizerName: string | null;
      locationId: string | null;
      locationName: string | null;
    }>
  >
> {
  if (!isSupabaseConfigured()) {
    return {};
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return {};
    }

    const { data, error } = await supabase
      .from("user_access_scopes")
      .select(
        "id, user_id, role, organizer_id, stadium_id, organizers:organizer_id(name), stadiums:stadium_id(name)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as Array<Record<string, unknown>>).reduce<
      Record<
        string,
        Array<{
          id: string;
          role: string;
          organizerId: string | null;
          organizerName: string | null;
          locationId: string | null;
          locationName: string | null;
        }>
      >
    >((acc, item) => {
      const userId = String(item.user_id ?? "");

      if (!userId) {
        return acc;
      }

      if (!acc[userId]) {
        acc[userId] = [];
      }

      const organizerRelation = item.organizers as { name?: string | null } | null;
      const locationRelation = item.stadiums as { name?: string | null } | null;

      acc[userId].push({
        id: String(item.id),
        role: String(item.role),
        organizerId: item.organizer_id ? String(item.organizer_id) : null,
        organizerName: organizerRelation?.name ?? null,
        locationId: item.stadium_id ? String(item.stadium_id) : null,
        locationName: locationRelation?.name ?? null,
      });

      return acc;
    }, {});
  } catch (error) {
    console.error("Nu am putut incarca scope-urile utilizatorilor.", error);
    return {};
  }
}

export async function getTeamCatalog(): Promise<TeamOption[]> {
  const fallbackNames = Array.from(
    new Set(
      [
        "Organizator principal",
        ...mockMatches.flatMap((match) => {
          const homeTeam = match.title.endsWith(` vs ${match.opponentName}`)
            ? match.title.slice(0, -(` vs ${match.opponentName}`).length)
            : match.title;

          return [homeTeam, match.opponentName];
        }),
      ]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ro"));

  if (!isSupabaseConfigured()) {
    return fallbackNames.map((name, index) =>
      teamOptionSchema.parse({
        id: `mock-team-${index + 1}`,
        name,
        slug: name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      }),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      throw new Error("Supabase server client indisponibil.");
    }

    const { data, error } = await supabase
      .from("teams")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    if (!rows.length) {
      return fallbackNames.map((name, index) =>
        teamOptionSchema.parse({
          id: `fallback-team-${index + 1}`,
          name,
          slug: name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
        }),
      );
    }

    return rows.map((item) =>
      teamOptionSchema.parse({
        id: item.id,
        name: item.name,
        slug: item.slug,
      }),
    );
  } catch (error) {
    console.error("Nu am putut incarca lista reutilizabila de echipe.", error);
    return fallbackNames.map((name, index) =>
      teamOptionSchema.parse({
        id: `fallback-team-${index + 1}`,
        name,
        slug: name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      }),
    );
  }
}

export async function getScannerMatches(): Promise<ScannerMatch[]> {
  if (!isSupabaseConfigured()) {
    return mockScannerMatches;
  }

  const matches = await getAdminMatchOverview();

  return matches
    .filter((match) => match.scannerEnabled)
    .map((match) => ({
      id: match.id,
      title: match.title,
      opponentName: match.opponentName,
      stadiumName: match.stadiumName,
      competitionName: match.competitionName,
      status: match.status,
      startsAt: match.startsAt,
      scannerEnabled: match.scannerEnabled,
    }));
}

export async function getStadiumBuilderData(): Promise<StadiumBuilder[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "demo-stadium",
        name: "Stadionul Municipal „Orhei”",
        slug: "stadionul-municipal-orhei",
        city: "Orhei",
        organizerId: null,
        organizerName: null,
        stands: [
          {
            id: "demo-stand-west",
            stadiumId: "demo-stadium",
            name: "Tribuna Vest",
            code: "TV",
            color: "#dc2626",
            sectors: ["sector-v1", "sector-v2"],
          },
          {
            id: "demo-stand-east",
            stadiumId: "demo-stadium",
            name: "Tribuna Est",
            code: "TE",
            color: "#111111",
            sectors: ["sector-e1"],
          },
        ],
        gates: [
          {
            id: "demo-gate-west",
            stadiumId: "demo-stadium",
            name: "Poarta Vest",
            code: "WEST",
            description: "Acces principal pentru tribuna vest.",
            sortOrder: 10,
            isActive: true,
          },
          {
            id: "demo-gate-east",
            stadiumId: "demo-stadium",
            name: "Poarta Est",
            code: "EAST",
            description: "Acces pentru tribuna est si sectorul family.",
            sortOrder: 20,
            isActive: true,
          },
          {
            id: "demo-gate-north",
            stadiumId: "demo-stadium",
            name: "Poarta Nord",
            code: "NORTH",
            description: "Acces pentru peluze si staff operational.",
            sortOrder: 30,
            isActive: true,
          },
        ],
        sponsors: [
          {
            id: "demo-sponsor-1",
            stadiumId: "demo-stadium",
            name: "Sponsor principal",
            logoUrl: "https://dummyimage.com/220x80/ffffff/dc2626.png&text=SPONSOR+1",
            websiteUrl: null,
            sortOrder: 0,
          },
          {
            id: "demo-sponsor-2",
            stadiumId: "demo-stadium",
            name: "Partener oficial",
            logoUrl: "https://dummyimage.com/220x80/ffffff/111111.png&text=PARTENER",
            websiteUrl: null,
            sortOrder: 1,
          },
        ],
        sectors: mockSeatMap.map((sector) => ({
          id: sector.sectorId,
          stadiumId: "demo-stadium",
          standId:
            sector.code.startsWith("V")
              ? "demo-stand-west"
              : sector.code.startsWith("E")
                ? "demo-stand-east"
                : null,
          gateId: sector.code.startsWith("V")
            ? "demo-gate-west"
            : sector.code.startsWith("E")
              ? "demo-gate-east"
              : "demo-gate-north",
          gateName: sector.code.startsWith("V")
            ? "Poarta Vest"
            : sector.code.startsWith("E")
              ? "Poarta Est"
              : "Poarta Nord",
          name: sector.name,
          code: sector.code,
          color: sector.color,
          rowsCount: new Set(sector.seats.map((seat) => seat.rowLabel)).size,
          seatsPerRow: Math.max(
            ...Object.values(
              sector.seats.reduce<Record<string, number>>((acc, seat) => {
                acc[seat.rowLabel] = (acc[seat.rowLabel] ?? 0) + 1;
                return acc;
              }, {}),
            ),
          ),
          seats: sector.seats.map((seat) => ({
            id: seat.seatId,
            rowLabel: seat.rowLabel,
            seatNumber: seat.seatNumber,
            seatLabel: seat.seatLabel,
            isDisabled: seat.availability === "disabled",
            isObstructed: seat.availability === "obstructed",
            isInternalOnly: seat.availability === "internal",
          })),
        })),
      },
    ];
  }

  try {
    const viewer = await getViewerContext();
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const stadiumResultWithOrganizer = await supabase
      .from("stadiums")
      .select("id, name, slug, city, organizer_id")
      .order("name");

    const stadiumResult =
      stadiumResultWithOrganizer.error && isOptionalSchemaError(stadiumResultWithOrganizer.error)
        ? await supabase.from("stadiums").select("id, name, slug, city").order("name")
        : stadiumResultWithOrganizer;

    const [
      { data: stands, error: standError },
      { data: gates, error: gateError },
      { data: sponsors, error: sponsorError },
      { data: sectors, error: sectorError },
      { data: seats, error: seatError },
      { data: organizers, error: organizerError },
    ] = await Promise.all([
      supabase
        .from("stadium_stands")
        .select("id, stadium_id, name, code, color")
        .order("sort_order"),
      supabase
        .from("gates")
        .select("id, stadium_id, name, code, description, sort_order, is_active")
        .order("sort_order")
        .order("name"),
      supabase
        .from("stadium_sponsors")
        .select("id, stadium_id, name, logo_url, website_url, sort_order")
        .order("sort_order")
        .order("name"),
      supabase
        .from("stadium_sectors")
        .select("id, stadium_id, stand_id, gate_id, name, code, color, rows_count, seats_per_row")
        .order("sort_order"),
      supabase
        .from("seats")
        .select("id, sector_id, row_label, seat_number, seat_label, is_disabled, is_obstructed, is_internal_only")
        .order("row_label")
        .order("seat_number"),
      supabase.from("organizers").select("id, name"),
    ]);

    const stadiumError = stadiumResult.error;

    if (stadiumError || standError || gateError || sponsorError || sectorError || seatError) {
      throw stadiumError ?? standError ?? gateError ?? sponsorError ?? sectorError ?? seatError;
    }

    const stadiumRows = (stadiumResult.data ?? []) as Record<string, unknown>[];
    const standRows = (stands ?? []) as Record<string, unknown>[];
    const gateRows = (gates ?? []) as Record<string, unknown>[];
    const sponsorRows = (sponsors ?? []) as Record<string, unknown>[];
    const sectorRows = (sectors ?? []) as Record<string, unknown>[];
    const seatRows = (seats ?? []) as Record<string, unknown>[];
    const organizerRows =
      organizerError && isOptionalSchemaError(organizerError)
        ? []
        : ((organizers ?? []) as Record<string, unknown>[]);
    const organizerNameById = new Map(
      organizerRows.map((item) => [String(item.id), String(item.name)]),
    );

    const seatsBySector = seatRows.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, seat) => {
        const sectorId = String(seat.sector_id);

        if (!acc[sectorId]) {
          acc[sectorId] = [];
        }
        acc[sectorId].push(seat);
        return acc;
      },
      {},
    );

    const standsByStadium = standRows.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, stand) => {
        const stadiumId = String(stand.stadium_id);

        if (!acc[stadiumId]) {
          acc[stadiumId] = [];
        }
        acc[stadiumId].push(stand);
        return acc;
      },
      {},
    );

    const gatesByStadium = gateRows.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, gate) => {
        const stadiumId = String(gate.stadium_id);

        if (!acc[stadiumId]) {
          acc[stadiumId] = [];
        }
        acc[stadiumId].push(gate);
        return acc;
      },
      {},
    );

    const sponsorsByStadium = sponsorRows.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, sponsor) => {
        const stadiumId = String(sponsor.stadium_id);

        if (!acc[stadiumId]) {
          acc[stadiumId] = [];
        }
        acc[stadiumId].push(sponsor);
        return acc;
      },
      {},
    );

    const sectorsByStadium = sectorRows.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, sector) => {
        const stadiumId = String(sector.stadium_id);

        if (!acc[stadiumId]) {
          acc[stadiumId] = [];
        }
        acc[stadiumId].push(sector);
        return acc;
      },
      {},
    );

    const parsedRows = stadiumRows.map((stadium) => {
      const stadiumId = String(stadium.id);
      const organizerId = stadium.organizer_id ? String(stadium.organizer_id) : null;

      return {
        id: stadiumId,
        name: String(stadium.name),
        slug: String(stadium.slug),
        city: String(stadium.city),
        organizerId,
        organizerName: organizerId ? organizerNameById.get(organizerId) ?? null : null,
        stands: (standsByStadium[stadiumId] ?? []).map((stand) => ({
          id: String(stand.id),
          stadiumId,
          name: String(stand.name),
          code: String(stand.code),
          color: String(stand.color),
          sectors: (sectorsByStadium[stadiumId] ?? [])
            .filter((sector) => String(sector.stand_id ?? "") === String(stand.id))
            .map((sector) => String(sector.id)),
        })),
        gates: (gatesByStadium[stadiumId] ?? []).map((gate) => ({
          id: String(gate.id),
          stadiumId,
          name: String(gate.name),
          code: String(gate.code),
          description: gate.description ? String(gate.description) : null,
          sortOrder: Number(gate.sort_order ?? 0),
          isActive: Boolean(gate.is_active),
        })),
        sponsors: (sponsorsByStadium[stadiumId] ?? []).map((sponsor) => ({
          id: String(sponsor.id),
          stadiumId,
          name: String(sponsor.name),
          logoUrl: String(sponsor.logo_url),
          websiteUrl: sponsor.website_url ? String(sponsor.website_url) : null,
          sortOrder: Number(sponsor.sort_order ?? 0),
        })),
        sectors: (sectorsByStadium[stadiumId] ?? []).map(
          (sector: Record<string, unknown>) => {
            const sectorId = String(sector.id);
            const gateId = sector.gate_id ? String(sector.gate_id) : null;
            const gateName =
              gateId
                ? (gatesByStadium[stadiumId] ?? []).find((gate) => String(gate.id) === gateId)?.name
                : null;

            return {
              id: sectorId,
              stadiumId: String(sector.stadium_id),
              standId: sector.stand_id ? String(sector.stand_id) : null,
              gateId,
              gateName: gateName ? String(gateName) : null,
              name: String(sector.name),
              code: String(sector.code),
              color: String(sector.color),
              rowsCount: Number(sector.rows_count),
              seatsPerRow: Number(sector.seats_per_row),
              seats: (seatsBySector[sectorId] ?? []).map(
                (seat: Record<string, unknown>) => ({
                  id: String(seat.id),
                  rowLabel: String(seat.row_label),
                  seatNumber: Number(seat.seat_number),
                  seatLabel: String(seat.seat_label),
                  isDisabled: Boolean(seat.is_disabled),
                  isObstructed: Boolean(seat.is_obstructed),
                  isInternalOnly: Boolean(seat.is_internal_only),
                }),
              ),
            };
          },
        ),
      };
    });

    if (isGlobalAdmin(viewer) || !hasScopedOperationsAccess(viewer)) {
      return parsedRows;
    }

    return parsedRows.filter((item) =>
      canAccessLocation(viewer, item.id, item.organizerId),
    );
  } catch (error) {
    console.error("Nu am putut încărca builder-ul stadionului.", error);
    return [];
  }
}

export async function getStadiumSponsors(stadiumId: string): Promise<StadiumSponsor[]> {
  if (!isSupabaseConfigured()) {
    const mockStadium = (await getStadiumBuilderData()).find((item) => item.id === stadiumId);
    return mockStadium?.sponsors ?? [];
  }

  try {
    const supabase = createSupabasePublicServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("stadium_sponsors")
      .select("id, stadium_id, name, logo_url, website_url, sort_order")
      .eq("stadium_id", stadiumId)
      .order("sort_order")
      .order("name");

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    return rows.map((item) => ({
      id: String(item.id),
      stadiumId: String(item.stadium_id),
      name: String(item.name),
      logoUrl: String(item.logo_url),
      websiteUrl: item.website_url ? String(item.website_url) : null,
      sortOrder: Number(item.sort_order ?? 0),
    }));
  } catch (error) {
    console.error("Nu am putut încărca sponsorii stadionului.", error);
    return [];
  }
}

export async function getStadiumMapConfigByStadiumId(
  stadiumId: string,
): Promise<StadiumMapConfig | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createSupabasePublicServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("stadium_map_configs")
      .select("config")
      .eq("stadium_id", stadiumId)
      .eq("is_active", true)
      .maybeSingle();

    const row = data as { config?: unknown } | null;

    if (error || !row?.config) {
      return null;
    }

    return stadiumMapConfigSchema.parse(row.config);
  } catch (error) {
    console.error("Nu am putut incarca configuratia de harta pentru stadion.", error);
    return null;
  }
}

export async function getAdminStadiumMapConfigs(): Promise<
  Array<{
    stadiumId: string;
    mapKey: string;
    isActive: boolean;
    config: StadiumMapConfig;
  }>
> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("stadium_map_configs")
      .select("stadium_id, map_key, is_active, config")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    return rows.flatMap((row) => {
      try {
        return [
          {
            stadiumId: String(row.stadium_id),
            mapKey: String(row.map_key),
            isActive: Boolean(row.is_active),
            config: stadiumMapConfigSchema.parse(row.config),
          },
        ];
      } catch (parseError) {
        console.error("Configuratie de harta invalida pentru stadion.", parseError);
        return [];
      }
    });
  } catch (error) {
    console.error("Nu am putut incarca configurarile admin pentru hartile stadionului.", error);
    return [];
  }
}

export async function getCheckoutSummary(
  matchId: string,
  holdToken: string,
  viewer: ViewerContext,
): Promise<CheckoutSummary | null> {
  if (!viewer.userId || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("seat_holds")
      .select(
        `
          hold_token,
          expires_at,
          match_id,
          matches!inner (
            id,
            slug,
            title,
            starts_at,
            stadiums!inner (name),
            match_settings!left (
              ticketing_mode,
              ticket_price_cents,
              currency
            ),
            match_sector_overrides (
              sector_id,
              ticket_price_cents_override
            )
          ),
          seats!inner (
            id,
            row_label,
            seat_number,
            sector_id,
            stadium_sectors!inner (name),
            gates (name)
          )
        `,
      )
      .eq("match_id", matchId)
      .eq("user_id", viewer.userId)
      .eq("hold_token", holdToken)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{
      hold_token: string;
      expires_at: string;
      matches:
        | {
            id: string;
            slug: string;
            title: string;
            starts_at: string;
            stadiums?: { name?: string | null } | Array<{ name?: string | null }> | null;
            match_settings?:
              | {
                  ticketing_mode?: string | null;
                  ticket_price_cents?: number | null;
                  currency?: string | null;
                }
              | Array<{
                  ticketing_mode?: string | null;
                  ticket_price_cents?: number | null;
                  currency?: string | null;
                }>
              | null;
            match_sector_overrides?:
              | Array<{
                  sector_id?: string | null;
                  ticket_price_cents_override?: number | null;
                }>
              | {
                  sector_id?: string | null;
                  ticket_price_cents_override?: number | null;
                }
              | null;
          }
        | Array<{
            id: string;
            slug: string;
            title: string;
            starts_at: string;
            stadiums?: { name?: string | null } | Array<{ name?: string | null }> | null;
            match_settings?:
              | {
                  ticketing_mode?: string | null;
                  ticket_price_cents?: number | null;
                  currency?: string | null;
                }
              | Array<{
                  ticketing_mode?: string | null;
                  ticket_price_cents?: number | null;
                  currency?: string | null;
                }>
              | null;
            match_sector_overrides?:
              | Array<{
                  sector_id?: string | null;
                  ticket_price_cents_override?: number | null;
                }>
              | {
                  sector_id?: string | null;
                  ticket_price_cents_override?: number | null;
                }
              | null;
          }>;
      seats:
        | {
            id: string;
            sector_id: string;
            row_label: string;
            seat_number: number;
            stadium_sectors?:
              | { name?: string | null }
              | Array<{ name?: string | null }>
              | null;
            gates?: { name?: string | null } | Array<{ name?: string | null }> | null;
          }
        | Array<{
            id: string;
            sector_id: string;
            row_label: string;
            seat_number: number;
            stadium_sectors?:
              | { name?: string | null }
              | Array<{ name?: string | null }>
              | null;
            gates?: { name?: string | null } | Array<{ name?: string | null }> | null;
          }>;
    }>;

    if (!rows.length) {
      return null;
    }

    const matchRecord = Array.isArray(rows[0]?.matches)
      ? rows[0].matches[0]
      : rows[0]?.matches;
    const settingsRecord = Array.isArray(matchRecord?.match_settings)
      ? matchRecord.match_settings[0]
      : matchRecord?.match_settings;
    const stadiumRecord = Array.isArray(matchRecord?.stadiums)
      ? matchRecord.stadiums[0]
      : matchRecord?.stadiums;

    const ticketPriceCents = Number(settingsRecord?.ticket_price_cents ?? 0);
    const items = rows.map((row) => {
      const seatRecord = Array.isArray(row.seats) ? row.seats[0] : row.seats;
      const sectorRecord = Array.isArray(seatRecord?.stadium_sectors)
        ? seatRecord.stadium_sectors[0]
        : seatRecord?.stadium_sectors;
      const gateRecord = Array.isArray(seatRecord?.gates)
        ? seatRecord.gates[0]
        : seatRecord?.gates;

      return {
        seatId: seatRecord.id,
        sectorId: String(seatRecord.sector_id),
        sectorName: sectorRecord?.name ?? "Sector",
        rowLabel: seatRecord.row_label,
        seatNumber: seatRecord.seat_number,
        gateName: gateRecord?.name ?? null,
      };
    });

    const sectorOverridesRaw = (matchRecord as { match_sector_overrides?: unknown })
      ?.match_sector_overrides;
    const sectorOverrides = Array.isArray(sectorOverridesRaw)
      ? sectorOverridesRaw
      : sectorOverridesRaw
        ? [sectorOverridesRaw]
        : [];
    const sectorPriceMap = new Map<string, number>(
      sectorOverrides
        .map((item): [string, number] | null => {
          const sectorId =
            typeof item === "object" && item && "sector_id" in item
              ? String((item as { sector_id?: string | null }).sector_id ?? "")
              : "";

          if (!sectorId) {
            return null;
          }

          const price =
            typeof item === "object" && item && "ticket_price_cents_override" in item
              ? Number(
                  (item as { ticket_price_cents_override?: number | null })
                    .ticket_price_cents_override ?? 0,
                )
              : 0;

          return [sectorId, price];
        })
        .filter((item): item is [string, number] => Boolean(item)),
    );
    const normalizedItems = items.map((item) => ({
      ...item,
      priceCents: sectorPriceMap.get(item.sectorId) ?? ticketPriceCents,
      currency: settingsRecord?.currency ?? "MDL",
    }));
    const finalItems = normalizedItems.map((item) => ({
      seatId: item.seatId,
      sectorName: item.sectorName,
      rowLabel: item.rowLabel,
      seatNumber: item.seatNumber,
      gateName: item.gateName,
      priceCents: item.priceCents,
      currency: item.currency,
    }));

    return checkoutSummarySchema.parse({
      holdToken,
      matchId: matchRecord.id,
      matchSlug: matchRecord.slug,
      matchTitle: matchRecord.title,
      startsAt: matchRecord.starts_at,
      stadiumName: stadiumRecord?.name ?? "Stadion",
      ticketingMode: settingsRecord?.ticketing_mode ?? "free",
      ticketPriceCents,
      currency: settingsRecord?.currency ?? "MDL",
      totalAmountCents: finalItems.reduce((sum, item) => sum + item.priceCents, 0),
      expiresAt: rows[0].expires_at,
      items: finalItems,
    });
  } catch (error) {
    console.error("Nu am putut încărca sumarul pentru checkout.", error);
    return null;
  }
}
