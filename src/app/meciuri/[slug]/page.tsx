import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarClock, MapPin, ShieldCheck, TimerReset } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicMatchBySlug, getSeatMapForMatch } from "@/lib/supabase/queries";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const match = await getPublicMatchBySlug(slug);

  if (!match) {
    notFound();
  }

  const sectors = await getSeatMapForMatch(match.id);
  const sectorSummaries = sectors.map((sector) => ({
    ...sector,
    available: sector.seats.filter((seat) => seat.availability === "available").length,
    reserved: sector.seats.filter((seat) => seat.availability === "reserved").length,
    blocked: sector.seats.filter((seat) =>
      ["blocked", "disabled", "obstructed", "internal"].includes(seat.availability),
    ).length,
  }));

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-white/10 bg-[#08140f] text-white">
          <div className="h-2 bg-gradient-to-r from-[#11552d] via-[#d5a021] to-[#11552d]" />
          <CardContent className="space-y-6 p-8">
            <Badge className="rounded-full bg-[#123826] text-[#f8d376] hover:bg-[#123826]">
              {match.competitionName}
            </Badge>
            <div>
              <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.12em]">
                {match.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/72">
                {match.description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={CalendarClock}
                label="Program"
                value={format(new Date(match.startsAt), "EEEE, d MMMM yyyy • HH:mm", {
                  locale: ro,
                })}
              />
              <InfoRow
                icon={MapPin}
                label="Stadion"
                value={`${match.stadiumName}, ${match.city}`}
              />
              <InfoRow
                icon={ShieldCheck}
                label="Limita standard"
                value={`${match.maxTicketsPerUser} bilete / cont`}
              />
              <InfoRow
                icon={TimerReset}
                label="Rezervare deschisa"
                value={
                  match.reservationClosesAt
                    ? `Pana la ${format(new Date(match.reservationClosesAt), "d MMMM • HH:mm", {
                        locale: ro,
                      })}`
                    : "Conform setarilor meciului"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d5a021]/15 bg-white/95">
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#7c5b0b]">
                Ticketing live
              </p>
              <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
                Snapshot
              </h2>
            </div>
            <div className="grid gap-3 text-sm text-slate-600">
              <StatChip label="Bilete emise" value={match.issuedCount} />
              <StatChip label="Bilete scanate" value={match.scannedCount} />
              <StatChip label="Locuri estimate disponibile" value={match.availableEstimate} />
            </div>
            <Button asChild className="w-full rounded-full bg-[#11552d] hover:bg-[#0e4524]">
              <Link href={`/meciuri/${match.slug}/rezerva`}>
                Vezi harta si continua spre rezervare
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
            Disponibilitate pe sectoare
          </p>
          <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
            Structura stadionului
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectorSummaries.map((sector) => (
            <Card key={sector.sectorId} className="border-[#e7dfbf] bg-white/95">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div>
                    <p className="font-semibold text-[#08140f]">{sector.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      {sector.code}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <span>{sector.available} disponibile</span>
                  <span>{sector.reserved} rezervate / hold</span>
                  <span>{sector.blocked} blocate sau indisponibile</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#f8d376]" />
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">{label}</p>
          <p className="mt-1 text-sm text-white/78">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f8f5e9] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#08140f]">{value}</p>
    </div>
  );
}
