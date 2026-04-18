import { NextResponse } from "next/server";

import { hasAnyRole } from "@/lib/auth/roles";
import { getAdminMatchOverview, getAdminUsersOverview, getViewerContext } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["admin", "superadmin"])) {
    return new NextResponse("Acces interzis.", { status: 403 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "tickets";
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
    const { data } = await supabase
      .from("ticket_scans")
      .select("scanned_at, result, device_label, ticket_id, match_id")
      .order("scanned_at", { ascending: false })
      .limit(500);

    rows = (data ?? []).map((scan) => ({
      ticket_id: scan.ticket_id,
      match_id: scan.match_id,
      scanned_at: scan.scanned_at,
      rezultat: scan.result,
      dispozitiv: scan.device_label,
    }));
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

  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}.csv"`,
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
