import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  CalendarClock,
  CreditCard,
  MapPin,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicMatchBySlug, getSeatMapForMatch } from "@/lib/supabase/queries";
import { formatCurrencyFromCents } from "@/lib/utils";

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

  const isPaid = match.ticketingMode === "paid";
  const visualUrl = match.bannerUrl ?? match.posterUrl;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="surface-dark overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(201,162,79,0.28),transparent_30%),linear-gradient(180deg,#0B1A33_0%,#081326_100%)] text-white">
          <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#E7D6A5_36%,#C9A24F_100%)]" />
          {visualUrl ? (
            <div
              className="aspect-[16/7] border-b border-white/10 bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(180deg,rgba(11,26,51,0.18),rgba(11,26,51,0.72)),url("${visualUrl}")` }}
            />
          ) : null}
          <CardContent className="space-y-7 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#E7D6A5] hover:bg-white/8">
                {match.competitionName}
              </Badge>
              <Badge className="rounded-full border border-[#E7D6A5]/20 bg-[#C9A24F]/12 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white hover:bg-[#C9A24F]/12">
                {isPaid ? "Eveniment cu plata" : "Eveniment gratuit"}
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.1em]">
                {match.title}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-white/74">
                {match.description}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={CalendarClock}
                label="Program"
                value={format(new Date(match.startsAt), "EEEE, d MMMM yyyy - HH:mm", {
                  locale: ro,
                })}
              />
              <InfoRow
                icon={MapPin}
                label="Locatie"
                value={`${match.stadiumName}, ${match.city}`}
              />
              <InfoRow
                icon={ShieldCheck}
                label="Limita standard"
                value={`${match.maxTicketsPerUser} bilete / cont`}
              />
              <InfoRow
                icon={TimerReset}
                label="Ticketing activ"
                value={
                  match.reservationClosesAt
                    ? `Pana la ${format(new Date(match.reservationClosesAt), "d MMMM - HH:mm", {
                        locale: ro,
                      })}`
                    : "Conform setarilor evenimentului"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[34px] border border-white/70 bg-white/95">
          <div className="h-1.5 bg-[linear-gradient(90deg,#0B1A33_0%,#C9A24F_45%,#E7D6A5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#C9A24F]">
                Snapshot ticketing
              </p>
              <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Acces rapid
              </h2>
            </div>

            <div className="grid gap-3 text-sm text-neutral-700">
              <StatChip label="Bilete emise" value={match.issuedCount} />
              <StatChip label="Bilete scanate" value={match.scannedCount} />
              <StatChip label="Locuri disponibile" value={match.availableEstimate} />
            </div>

            <div className="rounded-[26px] border border-black/6 bg-neutral-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Mod ticketing
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                {isPaid
                  ? `Procurare cu plata la ${formatCurrencyFromCents(match.ticketPriceCents, match.currency)} / loc.`
                  : "Bilet gratuit disponibil imediat dupa autentificare, cu blocare temporara a locurilor in timpul selectiei."}
              </p>
            </div>

            <Button
              asChild
              className="w-full rounded-full border border-[#0B1A33] bg-[#0B1A33] text-white hover:bg-[#132641]"
            >
              <Link href={`/meciuri/${match.slug}/rezerva`}>
                {isPaid ? (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Vezi harta si procura bilete
                  </>
                ) : (
                  "Vezi harta si obtine biletul gratuit"
                )}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Disponibilitate pe sectoare
          </p>
          <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
            Structura locatiei
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sectorSummaries.map((sector) => (
            <Card
              key={sector.sectorId}
              className="surface-panel overflow-hidden rounded-[28px] border border-white/70 bg-white/95"
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div>
                    <p className="font-semibold text-[#111111]">{sector.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                      {sector.code}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-neutral-600">
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
    <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#E7D6A5]" />
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
    <div className="rounded-[24px] border border-black/6 bg-neutral-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#111111]">{value}</p>
    </div>
  );
}
