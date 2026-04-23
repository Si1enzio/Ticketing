import { NextResponse } from "next/server";

import { hasAnyRole } from "@/lib/auth/roles";
import { withNoStoreHeaders } from "@/lib/security/http";
import { getAdminMatchOverview, getAdminUsersOverview, getViewerContext } from "@/lib/supabase/queries";
import { getAdminUserStats, getMatchReport } from "@/lib/supabase/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["admin", "superadmin"])) {
    return new NextResponse("Acces interzis.", { status: 403 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "tickets";
  const matchId = url.searchParams.get("matchId");
  const userId = url.searchParams.get("userId");
  const supabase = await createSupabaseServerClient();

  let rows: Record<string, string | number | null>[] = [];

  if (kind === "abuse") {
    const users = await getAdminUsersOverview();
    rows = users.map((user) => ({
      user_id: user.userId,
      nume: user.fullName,
      email: user.email,
      roluri: user.roles.join(", "),
      rezervate_total: user.totalReserved,
      scanate_total: user.totalScanned,
      no_show_ratio: user.noShowRatio,
      abuse_score: user.abuseScore,
      blocare_activa: user.activeBlockType,
      blocat_pana: user.activeBlockUntil,
    }));
  } else if (kind === "tickets" && supabase) {
    const { data } = await supabase
      .from("ticket_delivery_view")
      .select("*")
      .order("starts_at", { ascending: true });

    rows = (data ?? []).map((ticket) => ({
      ticket_code: ticket.ticket_code,
      meci: ticket.match_title,
      competitie: ticket.competition_name,
      data_start: ticket.starts_at,
      sector: ticket.sector_name,
      rand: ticket.row_label,
      loc: ticket.seat_number,
      status: ticket.ticket_status,
      sursa: ticket.source,
      titular: ticket.purchaser_name,
      email: ticket.purchaser_email,
    }));
  } else if (kind === "scans" && supabase) {
    let query = supabase
      .from("scan_log_overview")
      .select("*")
      .order("scanned_at", { ascending: false })
      .limit(500);

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    if (userId) {
      query = query.eq("holder_user_id", userId);
    }

    const { data } = await query;

    rows = (data ?? []).map((scan) => ({
      meci: scan.match_title,
      ticket_code: scan.ticket_code,
      scanned_at: scan.scanned_at,
      rezultat: scan.result,
      dispozitiv: scan.device_label,
      poarta: scan.gate_name,
      steward: scan.steward_name ?? scan.steward_email,
      utilizator: scan.holder_name ?? scan.holder_email,
      sector: scan.sector_name,
      rand: scan.row_label,
      loc: scan.seat_number,
      sursa: scan.ticket_source,
      fingerprint: scan.token_fingerprint,
    }));
  } else if (kind === "user-stats" && userId) {
    const stats = await getAdminUserStats(userId);
    rows = stats
      ? [
          {
            user_id: stats.userId,
            nume: stats.fullName,
            email: stats.email,
            roluri: stats.roles.join(", "),
            acces_bilete: stats.canReserve ? "da" : "nu",
            rezervate_total: stats.totalReserved,
            intrari_validate: stats.totalScanned,
            no_show_ratio: stats.noShowRatio,
            abuse_score: stats.abuseScore,
            bilete_platite: stats.paidTickets,
            bilete_gratuite: stats.nonPaidTickets,
            abonamente_active: stats.activeSubscriptions,
            total_platit_centi: stats.totalPaidCents,
            ultimul_acces: stats.lastEntryAt,
          },
        ]
      : [];
  } else {
    if (matchId) {
      const match = await getMatchReport(matchId);
      rows = match
        ? [
            {
              match_id: match.matchId,
              meci: match.title,
              competitie: match.competitionName,
              start: match.startsAt,
              status: match.status,
              emise: match.issuedCount,
              procurate: match.purchasedCount,
              intrari: match.enteredCount,
              blocate: match.blockedCount,
              repetate: match.repeatedCount,
              scanari_valide: match.validScanCount,
              scanari_invalide: match.invalidScanCount,
              anulate: match.canceledCount,
            },
          ]
        : [];
    } else {
      const matches = await getAdminMatchOverview();
      rows = matches.map((match) => ({
        match_id: match.id,
        meci: match.title,
        competitie: match.competitionName,
        start: match.startsAt,
        status: match.status,
        emise: match.issuedCount,
        scanate: match.scannedCount,
        no_show: match.noShowCount,
        scanari_duplicate: match.duplicateScanAttempts,
      }));
    }
  }

  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      ...Object.fromEntries(withNoStoreHeaders()),
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header] ?? "";
        return `"${String(value).replaceAll('"', '""')}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}
