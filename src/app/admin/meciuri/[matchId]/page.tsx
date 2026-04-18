import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMatchReport, getMatchScanLogs } from "@/lib/supabase/reports";

export default async function AdminMatchDetailsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  await connection();
  const { matchId } = await params;
  const [report, scans] = await Promise.all([
    getMatchReport(matchId),
    getMatchScanLogs(matchId),
  ]);

  if (!report) {
    notFound();
  }

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
            {report.competitionName} · {report.stadiumName} ·{" "}
            {format(new Date(report.startsAt), "d MMMM yyyy, HH:mm", { locale: ro })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
          >
            <Link href={`/admin/export?kind=scans&matchId=${report.matchId}`}>Export scanari CSV</Link>
          </Button>
          <Button
            asChild
            className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
          >
            <Link href="/admin/meciuri">Inapoi la meciuri</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Bilete emise" value={report.issuedCount} />
        <MetricCard label="Bilete platite" value={report.purchasedCount} />
        <MetricCard label="Intrari validate" value={report.enteredCount} />
        <MetricCard label="Bilete blocate" value={report.blockedCount} />
        <MetricCard label="Scanari repetate" value={report.repeatedCount} />
        <MetricCard label="Scanari valide" value={report.validScanCount} />
        <MetricCard label="Scanari invalide" value={report.invalidScanCount} />
        <MetricCard label="Bilete active" value={report.activeCount} />
        <MetricCard label="Bilete anulate" value={report.canceledCount} />
        <MetricCard label="Surse interne" value={report.internalCount} />
      </div>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Log scanare
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Ore, coduri, steward, poarta si rezultat pentru fiecare scanare.
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
                        {format(new Date(scan.scannedAt), "d MMM yyyy, HH:mm:ss", {
                          locale: ro,
                        })}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                      {scan.matchTitle}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2 xl:grid-cols-4">
                    <p>Loc: {scan.sectorName ?? "-"} · {scan.rowLabel ?? "-"} / {scan.seatNumber ?? "-"}</p>
                    <p>Tribuna: {scan.standName ?? "Nedefinita"}</p>
                    <p>Poarta: {scan.gateName ?? "Nedefinita"}</p>
                    <p>Dispozitiv: {scan.deviceLabel ?? "Necunoscut"}</p>
                    <p>Steward: {scan.stewardName ?? scan.stewardEmail ?? "Necunoscut"}</p>
                    <p>Holder: {scan.holderName ?? scan.holderEmail ?? "Necunoscut"}</p>
                    <p>Sursa bilet: {scan.ticketSource ?? "-"}</p>
                    <p>Fingerprint: {scan.tokenFingerprint ?? "-"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-white/75 p-5 text-sm text-neutral-600">
                Nu exista scanari inregistrate pentru acest meci.
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
