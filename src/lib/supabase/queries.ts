import "server-only";

import { hasMinimumRole, normalizeRoles } from "@/lib/auth/roles";
import {
  adminMatchOverviewSchema,
  adminUserOverviewSchema,
  publicMatchSchema,
  seatMapSeatSchema,
  ticketCardSchema,
  type AdminMatchOverview,
  type AdminUserOverview,
  type CheckoutSummary,
  type PublicMatch,
  type ScannerMatch,
  type SeatMapSector,
  type StadiumBuilder,
  type StadiumSponsor,
  type TicketCard,
  type ViewerContext,
  checkoutSummarySchema,
} from "@/lib/domain/types";
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

function enrichViewer(
  base: Omit<ViewerContext, "isAdmin" | "isAuthenticated" | "isPrivileged">,
): ViewerContext {
  const roles = normalizeRoles(base.roles);

  return {
    ...base,
    roles,
    isAuthenticated: Boolean(base.userId),
    isPrivileged: hasMinimumRole(roles, "admin"),
    isAdmin: hasMinimumRole(roles, "admin"),
  };
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
    } = await supabase.auth.getUser();

    if (!user) {
      return mockViewer;
    }

    const [{ data: profile }, { data: roles }, { data: block }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, can_reserve")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("user_blocks")
        .select("type, ends_at, reason")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profileRecord = profile as {
      full_name?: string | null;
      can_reserve?: boolean | null;
    } | null;
    const roleRows = (roles ?? []) as Array<{ role: string }>;
    const activeBlock = block as { ends_at?: string | null; reason?: string | null } | null;

    return enrichViewer({
      userId: user.id,
      email: user.email ?? null,
      fullName: profileRecord?.full_name ?? null,
      canReserve: Boolean(profileRecord?.can_reserve),
      roles: normalizeRoles(roleRows.map((item) => item.role)),
      reservationBlockedUntil: activeBlock?.ends_at ?? null,
      reservationBlockReason: activeBlock?.reason ?? null,
    });
  } catch (error) {
    console.error("Nu am putut încărca contextul utilizatorului.", error);
    return mockViewer;
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

    const { data, error } = await supabase
      .from("match_seat_status")
      .select("*")
      .eq("match_id", matchId)
      .order("sector_sort_order", { ascending: true })
      .order("row_sort_order", { ascending: true })
      .order("seat_number", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

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
        heldByCurrentUser: viewer.userId === item.held_by_user_id,
        gateName: item.gate_name,
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

    return rows.map((item) =>
      adminMatchOverviewSchema.parse({
        id: item.id,
        stadiumId: item.stadium_id,
        slug: item.slug,
        title: item.title,
        competitionName: item.competition_name,
        opponentName: item.opponent_name,
        stadiumName: item.stadium_name,
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

    return rows.map((item) =>
      adminUserOverviewSchema.parse({
        userId: item.user_id,
        email: item.email,
        fullName: item.full_name,
        roles: item.roles,
        canReserve: item.can_reserve,
        totalReserved: item.total_reserved,
        totalScanned: item.total_scanned,
        noShowRatio: item.no_show_ratio,
        abuseScore: item.abuse_score,
        activeBlockType: item.active_block_type,
        activeBlockUntil: item.active_block_until,
      }),
    );
  } catch (error) {
    console.error("Nu am putut încărca lista de utilizatori pentru admin.", error);
    return mockAdminUsers;
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
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const [
      { data: stadiums, error: stadiumError },
      { data: stands, error: standError },
      { data: sponsors, error: sponsorError },
      { data: sectors, error: sectorError },
      { data: seats, error: seatError },
    ] =
      await Promise.all([
        supabase.from("stadiums").select("id, name, slug, city").order("name"),
        supabase
          .from("stadium_stands")
          .select("id, stadium_id, name, code, color")
          .order("sort_order"),
        supabase
          .from("stadium_sponsors")
          .select("id, stadium_id, name, logo_url, website_url, sort_order")
          .order("sort_order")
          .order("name"),
        supabase
          .from("stadium_sectors")
          .select("id, stadium_id, stand_id, name, code, color, rows_count, seats_per_row")
          .order("sort_order"),
        supabase
          .from("seats")
          .select("id, sector_id, row_label, seat_number, seat_label, is_disabled, is_obstructed, is_internal_only")
          .order("row_label")
          .order("seat_number"),
      ]);

    if (stadiumError || standError || sponsorError || sectorError || seatError) {
      throw stadiumError ?? standError ?? sponsorError ?? sectorError ?? seatError;
    }

    const stadiumRows = (stadiums ?? []) as Record<string, unknown>[];
    const standRows = (stands ?? []) as Record<string, unknown>[];
    const sponsorRows = (sponsors ?? []) as Record<string, unknown>[];
    const sectorRows = (sectors ?? []) as Record<string, unknown>[];
    const seatRows = (seats ?? []) as Record<string, unknown>[];

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

    return stadiumRows.map((stadium) => {
      const stadiumId = String(stadium.id);

      return {
        id: stadiumId,
        name: String(stadium.name),
        slug: String(stadium.slug),
        city: String(stadium.city),
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

            return {
              id: sectorId,
              stadiumId: String(sector.stadium_id),
              standId: sector.stand_id ? String(sector.stand_id) : null,
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
            )
          ),
          seats!inner (
            id,
            row_label,
            seat_number,
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
          }>;
      seats:
        | {
            id: string;
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
        sectorName: sectorRecord?.name ?? "Sector",
        rowLabel: seatRecord.row_label,
        seatNumber: seatRecord.seat_number,
        gateName: gateRecord?.name ?? null,
      };
    });

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
      totalAmountCents: ticketPriceCents * items.length,
      expiresAt: rows[0].expires_at,
      items,
    });
  } catch (error) {
    console.error("Nu am putut încărca sumarul pentru checkout.", error);
    return null;
  }
}
