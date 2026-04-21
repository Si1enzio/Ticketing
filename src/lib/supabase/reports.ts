import "server-only";

import {
  adminUserStatsSchema,
  matchReportSchema,
  matchSeatOverrideSchema,
  matchSectorPricingOverrideSchema,
  scanLogEntrySchema,
  subscriptionProductSchema,
  type AdminUserStats,
  type MatchSeatOverride,
  type MatchSectorPricingOverride,
  type MatchReport,
  type ScanLogEntry,
  type SubscriptionProduct,
  type UserSubscription,
  userSubscriptionSchema,
} from "@/lib/domain/types";
import { mockAdminMatches, mockAdminUsers } from "@/lib/domain/mock";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getMatchReport(matchId: string): Promise<MatchReport | null> {
  if (!isSupabaseConfigured()) {
    const match = mockAdminMatches.find((item) => item.id === matchId);

    if (!match) {
      return null;
    }

    return matchReportSchema.parse({
      matchId: match.id,
      slug: match.slug,
      title: match.title,
      competitionName: match.competitionName,
      opponentName: match.opponentName,
      stadiumName: match.stadiumName,
      startsAt: match.startsAt,
      status: match.status,
      issuedCount: match.issuedCount,
      purchasedCount: match.ticketingMode === "paid" ? match.issuedCount : 0,
      internalCount: 0,
      enteredCount: match.scannedCount,
      activeCount: Math.max(match.issuedCount - match.scannedCount, 0),
      canceledCount: 0,
      blockedCount: 0,
      repeatedCount: match.duplicateScanAttempts,
      validScanCount: match.scannedCount,
      invalidScanCount: match.duplicateScanAttempts,
      latestScanAt: null,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("match_reporting_overview")
      .select("*")
      .eq("match_id", matchId)
      .maybeSingle();

    if (error || !data) {
      throw error;
    }

    return matchReportSchema.parse({
      matchId: data.match_id,
      slug: data.slug,
      title: data.title,
      competitionName: data.competition_name,
      opponentName: data.opponent_name,
      stadiumName: data.stadium_name,
      startsAt: data.starts_at,
      status: data.status,
      issuedCount: data.issued_count,
      purchasedCount: data.purchased_count,
      internalCount: data.internal_count,
      enteredCount: data.entered_count,
      activeCount: data.active_count,
      canceledCount: data.canceled_count,
      blockedCount: data.blocked_count,
      repeatedCount: data.repeated_count,
      validScanCount: data.valid_scan_count,
      invalidScanCount: data.invalid_scan_count,
      latestScanAt: data.latest_scan_at,
    });
  } catch (error) {
    console.error("Nu am putut incarca raportul meciului.", error);
    return null;
  }
}

export async function getMatchScanLogs(matchId: string): Promise<ScanLogEntry[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("scan_log_overview")
      .select("*")
      .eq("match_id", matchId)
      .order("scanned_at", { ascending: false })
      .limit(500);

    if (error) {
      throw error;
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) =>
      scanLogEntrySchema.parse({
        id: row.id,
        matchId: row.match_id,
        matchSlug: row.match_slug,
        matchTitle: row.match_title,
        scannedAt: row.scanned_at,
        result: row.result,
        deviceLabel: row.device_label,
        tokenFingerprint: row.token_fingerprint,
        ticketId: row.ticket_id,
        ticketCode: row.ticket_code,
        ticketStatus: row.ticket_status,
        ticketSource: row.ticket_source,
        seatLabel: row.seat_label,
        rowLabel: row.row_label,
        seatNumber: row.seat_number,
        sectorName: row.sector_name,
        sectorCode: row.sector_code,
        standName: row.stand_name,
        gateName: row.gate_name,
        stewardUserId: row.steward_user_id,
        stewardName: row.steward_name,
        stewardEmail: row.steward_email,
        holderUserId: row.holder_user_id,
        holderName: row.holder_name,
        holderEmail: row.holder_email,
      }),
    );
  } catch (error) {
    console.error("Nu am putut incarca logurile de scanare.", error);
    return [];
  }
}

export async function getMatchSeatOverrides(matchId: string): Promise<MatchSeatOverride[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("match_seat_overrides")
      .select("id, match_id, seat_id, status, expires_at, note, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const now = Date.now();

    return ((data ?? []) as Record<string, unknown>[])
      .filter((row) => {
        if (row.status === "blocked") {
          return true;
        }

        if (row.status !== "admin_hold") {
          return false;
        }

        if (!row.expires_at) {
          return true;
        }

        return new Date(String(row.expires_at)).getTime() > now;
      })
      .map((row) =>
        matchSeatOverrideSchema.parse({
          id: row.id,
          matchId: row.match_id,
          seatId: row.seat_id,
          status: row.status,
          expiresAt: row.expires_at,
          note: row.note,
          createdAt: row.created_at,
        }),
      );
  } catch (error) {
    console.error("Nu am putut incarca override-urile de loc pentru meci.", error);
    return [];
  }
}

export async function getMatchSectorPricingOverrides(
  matchId: string,
): Promise<MatchSectorPricingOverride[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("match_sector_overrides")
      .select("sector_id, ticket_price_cents_override")
      .eq("match_id", matchId)
      .not("ticket_price_cents_override", "is", null);

    if (error) {
      throw error;
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) =>
      matchSectorPricingOverrideSchema.parse({
        sectorId: row.sector_id,
        ticketPriceCentsOverride: row.ticket_price_cents_override,
      }),
    );
  } catch (error) {
    console.error("Nu am putut incarca preturile pe sectoare pentru meci.", error);
    return [];
  }
}

export async function getAdminUserStats(userId: string): Promise<AdminUserStats | null> {
  if (!isSupabaseConfigured()) {
    const user = mockAdminUsers.find((item) => item.userId === userId);

    if (!user) {
      return null;
    }

    return adminUserStatsSchema.parse({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      canReserve: user.canReserve,
      roles: user.roles,
      totalReserved: user.totalReserved,
      totalScanned: user.totalScanned,
      noShowRatio: user.noShowRatio,
      abuseScore: user.abuseScore,
      activeBlockType: user.activeBlockType,
      activeBlockUntil: user.activeBlockUntil,
      paidTickets: 0,
      nonPaidTickets: user.totalReserved,
      usedTickets: user.totalScanned,
      canceledTickets: 0,
      activeSubscriptions: 0,
      totalPaidCents: 0,
      lastEntryAt: null,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("admin_user_profile_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      throw error;
    }

    return adminUserStatsSchema.parse({
      userId: data.user_id,
      email: data.email,
      fullName: data.full_name,
      canReserve: data.can_reserve,
      roles: data.roles,
      totalReserved: data.total_reserved,
      totalScanned: data.total_scanned,
      noShowRatio: data.no_show_ratio,
      abuseScore: data.abuse_score,
      activeBlockType: data.active_block_type,
      activeBlockUntil: data.active_block_until,
      paidTickets: data.paid_tickets,
      nonPaidTickets: data.non_paid_tickets,
      usedTickets: data.used_tickets,
      canceledTickets: data.canceled_tickets,
      activeSubscriptions: data.active_subscriptions,
      totalPaidCents: data.total_paid_cents,
      lastEntryAt: data.last_entry_at,
    });
  } catch (error) {
    console.error("Nu am putut incarca statistica utilizatorului.", error);
    return null;
  }
}

export async function getUserScanLogs(userId: string): Promise<ScanLogEntry[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("scan_log_overview")
      .select("*")
      .eq("holder_user_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) =>
      scanLogEntrySchema.parse({
        id: row.id,
        matchId: row.match_id,
        matchSlug: row.match_slug,
        matchTitle: row.match_title,
        scannedAt: row.scanned_at,
        result: row.result,
        deviceLabel: row.device_label,
        tokenFingerprint: row.token_fingerprint,
        ticketId: row.ticket_id,
        ticketCode: row.ticket_code,
        ticketStatus: row.ticket_status,
        ticketSource: row.ticket_source,
        seatLabel: row.seat_label,
        rowLabel: row.row_label,
        seatNumber: row.seat_number,
        sectorName: row.sector_name,
        sectorCode: row.sector_code,
        standName: row.stand_name,
        gateName: row.gate_name,
        stewardUserId: row.steward_user_id,
        stewardName: row.steward_name,
        stewardEmail: row.steward_email,
        holderUserId: row.holder_user_id,
        holderName: row.holder_name,
        holderEmail: row.holder_email,
      }),
    );
  } catch (error) {
    console.error("Nu am putut incarca istoricul de scanare al utilizatorului.", error);
    return [];
  }
}

export async function getSubscriptionProducts(): Promise<SubscriptionProduct[]> {
  if (!isSupabaseConfigured()) {
    return [
      subscriptionProductSchema.parse({
        id: "annual-pass",
        code: "annual-pass",
        name: "Abonament anual",
        durationType: "annual",
        durationMonths: 12,
        priceCents: 180000,
        currency: "MDL",
        description: "Acces sezon complet",
        isActive: true,
      }),
      subscriptionProductSchema.parse({
        id: "semiannual-pass",
        code: "semiannual-pass",
        name: "Abonament semi-anual",
        durationType: "semiannual",
        durationMonths: 6,
        priceCents: 95000,
        currency: "MDL",
        description: "Acces tur / retur",
        isActive: true,
      }),
    ];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("subscription_products")
      .select("*")
      .eq("is_active", true)
      .order("duration_months", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) =>
      subscriptionProductSchema.parse({
        id: row.id,
        code: row.code,
        name: row.name,
        durationType: row.duration_type,
        durationMonths: row.duration_months,
        priceCents: row.price_cents,
        currency: row.currency,
        description: row.description,
        isActive: row.is_active,
      }),
    );
  } catch (error) {
    console.error("Nu am putut incarca produsele de abonament.", error);
    return [];
  }
}

export async function getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(
        `
          id,
          user_id,
          status,
          starts_at,
          ends_at,
          price_paid_cents,
          currency,
          source,
          note,
          subscription_products!inner (
            id,
            code,
            name,
            duration_type,
            duration_months,
            price_cents,
            currency,
            description,
            is_active
          )
        `,
      )
      .eq("user_id", userId)
      .order("starts_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const product = Array.isArray(row.subscription_products)
        ? row.subscription_products[0]
        : row.subscription_products;

      return userSubscriptionSchema.parse({
        id: row.id,
        userId: row.user_id,
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        pricePaidCents: row.price_paid_cents,
        currency: row.currency,
        source: row.source,
        note: row.note,
        product: {
          id: product?.id,
          code: product?.code,
          name: product?.name,
          durationType: product?.duration_type,
          durationMonths: product?.duration_months,
          priceCents: product?.price_cents,
          currency: product?.currency,
          description: product?.description,
          isActive: product?.is_active,
        },
      });
    });
  } catch (error) {
    console.error("Nu am putut incarca abonamentele utilizatorului.", error);
    return [];
  }
}
