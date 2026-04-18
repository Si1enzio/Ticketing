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
      "Alegi sectorul si locurile intr-o experienta clara, gandita pentru mobil si trafic de meci.",
    icon: Ticket,
  },
  {
    title: "Validare instant",
    description:
      "Fiecare bilet are QR unic si raspuns imediat pentru steward la poarta.",
    icon: ShieldCheck,
  },
  {
    title: "Control operational",
    description:
      "Adminii vad limite, no-show, scanari duplicate si indicatori de abuz intr-un singur flux.",
    icon: UsersRound,
  },
] as const;

export default async function HomePage() {
  const matches = await getPublicMatches();
  const featuredMatch = matches[0] ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-black/6">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-18">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-[#dc2626]/15 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#b91c1c] shadow-sm">
              Stadionul Municipal Orhei
            </span>

            <div className="space-y-4">
              <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.1em] text-[#111111] sm:text-6xl lg:text-7xl">
                Ticketing alb pe rosu.
                <br />
                Matchday fara frictiune.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-neutral-600">
                O interfata mai curata, mai directa si mai sportiva pentru suporteri,
                stewarzi si admini. Rezervare rapida, acces sigur si control operational
                intr-o platforma unica.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full border border-[#dc2626] bg-[#dc2626] px-8 text-white hover:bg-[#b91c1c]"
              >
                <Link href={featuredMatch ? `/meciuri/${featuredMatch.slug}/rezerva` : "/"}>
                  Rezerva pentru urmatorul meci
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
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
                    className="surface-panel rounded-[26px] border border-white/60 bg-white/80"
                  >
                    <CardContent className="space-y-3 p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-[#111111]">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="surface-dark overflow-hidden rounded-[32px] border border-black/8 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.22),transparent_34%),linear-gradient(180deg,#171717_0%,#0f0f10_100%)]">
            <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_32%,#ef4444_100%)]" />
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-[#fca5a5]">
                  Matchday snapshot
                </p>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-white">
                  {featuredMatch?.title ?? "Meci demo pregatit"}
                </h2>
              </div>

              <div className="grid gap-3 text-sm text-white/72">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Bilete emise
                  </p>
                  <p className="mt-2 text-4xl font-semibold text-white">
                    {featuredMatch?.issuedCount ?? 0}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Disponibile
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {featuredMatch?.availableEstimate ?? 0}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Limita
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {featuredMatch?.maxTicketsPerUser ?? 4}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#ef4444]/25 bg-[#ef4444]/10 p-4 text-sm leading-6 text-white/78">
                Designul nou pune accent pe contrast, lizibilitate si viteza de actiune,
                mai ales pe mobil in ziua meciului.
              </div>

              <Button
                asChild
                size="lg"
                className="w-full rounded-full border border-white/10 bg-white text-[#111111] hover:bg-neutral-100"
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
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Meciuri publicate
            </p>
            <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.12em] text-[#111111]">
              Alege meciul si rezerva-ti locul
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-neutral-600">
            Paleta noua aduce un contrast mai puternic si un ritm vizual mai clar, dar
            pastram aceeasi logica de rezervare, scanare si administrare.
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
