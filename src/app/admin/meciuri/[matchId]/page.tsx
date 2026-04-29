import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MatchSectorPricingManager } from "@/components/admin/match-sector-pricing-manager";
import { MatchSeatOverridesManager } from "@/components/admin/match-seat-overrides-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeInTimeZone } from "@/lib/date-time";
import { formatSectorSeatPosition } from "@/lib/format/seat";
import { getAdminMatchOverview, getSeatMapForMatch, getStadiumMapConfigByStadiumId } from "@/lib/supabase/queries";
import {
  getMatchReport,
  getMatchScanLogs,
  getMatchSectorPricingOverrides,
  getMatchSeatOverrides,
} from "@/lib/supabase/reports";

export default async function AdminMatchDetailsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  await connection();
  const { matchId } = await params;

  const [report, scans, matches] = await Promise.all([
    getMatchReport(matchId),
    getMatchScanLogs(matchId),
    getAdminMatchOverview({ archiveMode: "include" }),
  ]);

  const matchOverview = matches.find((item) => item.id === matchId) ?? null;

  if (!report || !matchOverview) {
    notFound();
  }

  const [seatMap, stadiumMapConfig, seatOverrides, sectorPricingOverrides] = await Promise.all([
    getSeatMapForMatch(matchId),
    getStadiumMapConfigByStadiumId(matchOverview.stadiumId),
    getMatchSeatOverrides(matchId),
    getMatchSectorPricingOverrides(matchId),
  ]);

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Raport meci
          </p>
          <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
            {report.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-neutral-600">
            {report.competitionName} - {report.stadiumName} -{" "}
            {formatDateTimeInTimeZone(report.startsAt, {
              locale: "ro-RO",
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
          >
            <Link href={`/admin/export?kind=scans&matchId=${report.matchId}`}>Export scanări CSV</Link>
          </Button>
          <Button
            asChild
            className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
          >
            <Link href="/admin/meciuri">Înapoi la meciuri</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Bilete emise" value={report.issuedCount} />
        <MetricCard label="Bilete plătite" value={report.purchasedCount} />
        <MetricCard label="Intrări validate" value={report.enteredCount} />
        <MetricCard label="Bilete blocate" value={report.blockedCount} />
        <MetricCard label="Scanări repetate" value={report.repeatedCount} />
        <MetricCard label="Scanări valide" value={report.validScanCount} />
        <MetricCard label="Scanări invalide" value={report.invalidScanCount} />
        <MetricCard label="Bilete active" value={report.activeCount} />
        <MetricCard label="Bilete anulate" value={report.canceledCount} />
        <MetricCard label="Bilete administrative / interne" value={report.internalCount} />
      </div>

      <MatchSectorPricingManager
        matchId={report.matchId}
        ticketingMode={matchOverview.ticketingMode}
        baseTicketPriceCents={matchOverview.ticketPriceCents}
        currency={matchOverview.currency}
        sectors={seatMap}
        pricingOverrides={sectorPricingOverrides}
      />

      <MatchSeatOverridesManager
        matchId={report.matchId}
        stadiumId={matchOverview.stadiumId}
        stadiumName={report.stadiumName}
        sectors={seatMap}
        overrides={seatOverrides}
        stadiumMapConfig={stadiumMapConfig}
      />

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Log scanare
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Ore, coduri, steward, poartă și rezultat pentru fiecare scanare.
            </p>
          </div>

          <div className="grid gap-3">
            {scans.length ? (
              scans.map((scan) => (
                <div
                  key={scan.id}
                  className="rounded-[24px] border border-black/6 bg-neutral-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#111111]">
                        {scan.ticketCode ?? "Ticket necunoscut"} · {scan.result}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {formatDateTimeInTimeZone(scan.scannedAt, {
                          locale: "ro-RO",
                          includeSeconds: true,
                        })}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                      {scan.matchTitle}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2 xl:grid-cols-4">
                    <p>Pozitie: {formatSectorSeatPosition(scan)}</p>
                    <p>Tribună: {scan.standName ?? "Nedefinită"}</p>
                    <p>Poartă: {scan.gateName ?? "Nedefinită"}</p>
                    <p>Dispozitiv: {scan.deviceLabel ?? "Necunoscut"}</p>
                    <p>Steward: {scan.stewardName ?? scan.stewardEmail ?? "Necunoscut"}</p>
                    <p>Holder: {scan.holderName ?? scan.holderEmail ?? "Necunoscut"}</p>
                    <p>Sursă bilet: {scan.ticketSource ?? "-"}</p>
                    <p>Fingerprint: {scan.tokenFingerprint ?? "-"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-white/75 p-5 text-sm text-neutral-600">
                Nu există scanări înregistrate pentru acest meci.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="surface-panel rounded-[28px] border border-white/70 bg-white/92">
      <CardContent className="p-5">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="mt-2 text-4xl font-semibold text-[#111111]">{value}</p>
      </CardContent>
    </Card>
  );
}
