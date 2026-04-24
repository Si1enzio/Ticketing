import Link from "next/link";
import { ArrowRight, ShieldCheck, Ticket, UsersRound } from "lucide-react";

import { MatchCard } from "@/components/match-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { getPublicMatches } from "@/lib/supabase/queries";

const icons = [Ticket, ShieldCheck, UsersRound] as const;

export default async function HomePage() {
  const matches = await getPublicMatches();
  const featuredMatch = matches[0] ?? null;
  const { locale, messages } = await getServerI18n();

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-black/6">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-18">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-[#C9A24F]/25 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#0B1A33] shadow-sm">
              {messages.home.badge}
            </span>

            <div className="space-y-4">
              <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.1em] text-[#111111] sm:text-6xl lg:text-7xl">
                {messages.home.titleLine1}
                <br />
                {messages.home.titleLine2}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-neutral-600">
                {messages.home.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full border border-[#0B1A33] bg-[#0B1A33] px-8 text-white hover:bg-[#132641]"
              >
                <Link href="#evenimente">
                  {messages.home.primaryCta}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
              >
                <Link href="/autentificare">{messages.home.secondaryCta}</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {messages.home.highlights.map((item, index) => {
                const Icon = icons[index];

                return (
                  <Card
                    key={item.title}
                    className="surface-panel rounded-[26px] border border-white/60 bg-white/80"
                  >
                    <CardContent className="space-y-3 p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B1A33] text-[#E7D6A5]">
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

          <Card className="surface-dark overflow-hidden rounded-[32px] border border-black/8 bg-[radial-gradient(circle_at_top_right,rgba(201,162,79,0.24),transparent_34%),linear-gradient(180deg,#0B1A33_0%,#081326_100%)]">
            <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#E7D6A5_32%,#C9A24F_100%)]" />
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-[#E7D6A5]">
                  {messages.home.snapshotBadge}
                </p>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-white">
                  {featuredMatch?.title ?? messages.home.snapshotFallback}
                </h2>
              </div>

              <div className="grid gap-3 text-sm text-white/72">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {messages.home.issued}
                  </p>
                  <p className="mt-2 text-4xl font-semibold text-white">
                    {featuredMatch?.issuedCount ?? 0}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      {messages.home.available}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {featuredMatch?.availableEstimate ?? 0}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      {messages.home.limit}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">
                      {featuredMatch?.maxTicketsPerUser ?? 4}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#C9A24F]/25 bg-[#C9A24F]/10 p-4 text-sm leading-6 text-white/78">
                {messages.home.snapshotDescription}
              </div>

              <Button
                asChild
                size="lg"
                className="w-full rounded-full border border-white/10 bg-white text-[#111111] hover:bg-neutral-100"
              >
                <Link href={featuredMatch ? `/meciuri/${featuredMatch.slug}` : "/"}>
                  {messages.home.exploreCta} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        id="evenimente"
        className="mx-auto flex w-full max-w-7xl flex-1 scroll-mt-28 flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#C9A24F]">
              {messages.home.publishedBadge}
            </p>
            <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.12em] text-[#111111]">
              {messages.home.publishedTitle}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-neutral-600">
            {messages.home.publishedDescription}
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} locale={locale} messages={messages} />
          ))}
        </div>
      </section>
    </div>
  );
}
