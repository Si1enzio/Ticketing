import { ArrowRight, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import Link from "next/link";

import { MatchCard } from "@/components/match-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicMatches } from "@/lib/supabase/queries";

const highlights = [
  {
    title: "Rezervare rapida",
    description:
      "Alegi locul direct din harta si primesti biletele instant in cabinetul personal.",
    icon: Ticket,
  },
  {
    title: "Acces sigur",
    description:
      "Fiecare bilet are QR semnat si validare unica pentru steward la poarta.",
    icon: ShieldCheck,
  },
  {
    title: "Administrare completa",
    description:
      "Dashboard pentru meciuri, locuri, rapoarte, utilizatori si indicatori de abuz.",
    icon: UsersRound,
  },
] as const;

export default async function HomePage() {
  const matches = await getPublicMatches();
  const featuredMatch = matches[0] ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(213,160,33,0.18),_transparent_28%),linear-gradient(180deg,_#08140f_0%,_#0d1f16_44%,_#f6f5ef_44%,_#f6f5ef_100%)]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-[#d5a021]/30 bg-[#123826]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#f8d376]">
              Stadionul Municipal &quot;Orhei&quot;
            </span>
            <div className="space-y-4">
              <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.12em] text-white sm:text-6xl">
                Platforma de ticketing pentru meciurile FC Milsami
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/72">
                MVP construit pentru rezervari gratuite acum, dar arhitecturat
                pentru plati, abonamente, transferuri de bilete si integrare cu
                turnicheti mai tarziu.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[#d5a021] px-8 text-[#08140f] hover:bg-[#f0bd44]"
              >
                <Link href={featuredMatch ? `/meciuri/${featuredMatch.slug}/rezerva` : "/"}>
                  Rezerva pentru urmatorul meci
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/autentificare">Intra in cont</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <Card
                    key={item.title}
                    className="border-white/10 bg-white/5 text-white shadow-none"
                  >
                    <CardContent className="space-y-3 p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d5a021]/15 text-[#f8d376]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-white/68">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="overflow-hidden border-white/10 bg-[#0d1f16]/90 text-white shadow-[0_24px_90px_-44px_rgba(0,0,0,0.7)]">
            <div className="h-2 bg-gradient-to-r from-[#11552d] via-[#d5a021] to-[#11552d]" />
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-[#f8d376]">
                  Matchday snapshot
                </p>
                <h2 className="font-heading text-3xl uppercase tracking-[0.12em]">
                  {featuredMatch?.title ?? "Meci demo pregatit"}
                </h2>
              </div>
              <div className="grid gap-3 text-sm text-white/72">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  {featuredMatch?.issuedCount ?? 0} bilete deja emise
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  {featuredMatch?.availableEstimate ?? 0} locuri disponibile estimativ
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Limita curenta: {featuredMatch?.maxTicketsPerUser ?? 4} bilete /
                  suporter
                </div>
              </div>
              <Button
                asChild
                variant="secondary"
                className="w-full rounded-full bg-white text-[#08140f] hover:bg-white/90"
              >
                <Link href={featuredMatch ? `/meciuri/${featuredMatch.slug}` : "/"}>
                  Exploreaza meciul <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
              Meciuri publicate
            </p>
            <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
              Alege meciul si rezerva-ti locul
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Platforma afiseaza disponibilitatea generala, limitele per meci si
            starea ticketing-ului. Pentru rezervare este necesar un cont valid.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    </div>
  );
}
