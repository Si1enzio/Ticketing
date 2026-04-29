import type { Route } from "next";
import Link from "next/link";
import { Archive, ArrowRight, CalendarClock, ScanLine, Ticket } from "lucide-react";
import { connection } from "next/server";

import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeInTimeZone } from "@/lib/date-time";
import { getAdminMatchOverview } from "@/lib/supabase/queries";

function formatMatchStatus(status: string) {
  switch (status) {
    case "archived":
      return "Arhivat";
    case "completed":
      return "Finalizat";
    case "closed":
      return "Inchis";
    case "canceled":
      return "Anulat";
    default:
      return status;
  }
}

export default async function AdminArchivePage() {
  await connection();
  const archivedMatches = await getAdminMatchOverview({ archiveMode: "only" });

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Arhiva evenimente
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Evenimente iesite din circuitul public
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-neutral-600">
          Aici vezi evenimentele arhivate automat sau manual. Acestea nu mai sunt
          afisate utilizatorilor simpli si nu mai permit emiterea sau vanzarea de bilete.
        </p>
      </div>

      {archivedMatches.length ? (
        <div className="grid gap-4">
          {archivedMatches
            .slice()
            .sort(
              (left, right) =>
                new Date(right.archivedAt ?? right.startsAt).getTime() -
                new Date(left.archivedAt ?? left.startsAt).getTime(),
            )
            .map((match) => (
              <Card
                key={match.id}
                className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94"
              >
                <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#b8860b_45%,#fcd34d_100%)]" />
                <CardContent className="grid gap-5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-[260px] flex-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        {formatMatchStatus(match.status)} -{" "}
                        {formatDateTimeInTimeZone(match.startsAt)}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[#111111]">
                        {match.title}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {match.competitionName} · {match.stadiumName}
                      </p>
                    </div>

                    <Link
                      href={`/admin/meciuri/${match.id}` as Route}
                      className="inline-flex items-center gap-2 rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:bg-neutral-100"
                    >
                      Raport eveniment
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <ArchiveMetric
                      icon={Archive}
                      label="Arhivat la"
                      value={formatDateTimeInTimeZone(match.archivedAt ?? match.startsAt)}
                    />
                    <ArchiveMetric
                      icon={CalendarClock}
                      label="Start eveniment"
                      value={formatDateTimeInTimeZone(match.startsAt)}
                    />
                    <ArchiveMetric
                      icon={Ticket}
                      label="Bilete emise"
                      value={String(match.issuedCount)}
                    />
                    <ArchiveMetric
                      icon={ScanLine}
                      label="Scanate"
                      value={String(match.scannedCount)}
                    />
                    <ArchiveMetric
                      icon={Archive}
                      label="Status final"
                      value={formatMatchStatus(match.status)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card className="surface-panel rounded-[30px] border border-white/70 bg-white/94">
          <CardContent className="space-y-3 p-8">
            <h2 className="text-2xl font-semibold text-[#111111]">
              Nu exista inca evenimente arhivate
            </h2>
            <p className="text-sm leading-7 text-neutral-600">
              Evenimentele vor ajunge aici automat la 5 ore dupa start sau mai devreme,
              daca un admin decide arhivarea manuala.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ArchiveMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Archive;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-black/6 bg-neutral-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-[#111111]">{value}</p>
        </div>
        <div className="rounded-2xl bg-[#fff8e1] p-2 text-[#8a6508]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
