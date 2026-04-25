import Link from "next/link";
import { connection } from "next/server";
import { Gift, ScanLine, UsersRound } from "lucide-react";

import { RaffleRandomizer } from "@/components/admin/raffle-randomizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeInTimeZone } from "@/lib/date-time";
import { getAdminMatchOverview } from "@/lib/supabase/queries";
import { getMatchRaffleCandidates } from "@/lib/supabase/reports";

export default async function AdminRafflePage({
  searchParams,
}: {
  searchParams?: Promise<{ matchId?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const matches = await getAdminMatchOverview();
  const defaultMatch = pickDefaultMatch(matches);
  const selectedMatchId = resolvedSearchParams.matchId ?? defaultMatch?.id ?? "";
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? defaultMatch;
  const candidates = selectedMatch ? await getMatchRaffleCandidates(selectedMatch.id) : [];

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Concurs eveniment
          </p>
          <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
            Tombola participanti prezenti
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
            Selecteaza un eveniment, apoi extrage intre 1 si 20 castigatori din lista celor
            care au intrat efectiv cu scanare valida.
          </p>
        </div>
        <Button
          asChild
          className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
        >
          <Link href="/admin/meciuri">Inapoi la evenimente</Link>
        </Button>
      </div>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form action="/admin/tombola" className="grid gap-3">
            <label className="text-sm font-semibold text-[#111111]" htmlFor="matchId">
              Eveniment pentru tombola
            </label>
            <select
              id="matchId"
              name="matchId"
              defaultValue={selectedMatch?.id ?? ""}
              className="h-12 rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#dc2626]"
            >
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.title} -{" "}
                  {formatDateTimeInTimeZone(match.startsAt, {
                    locale: "ro-RO",
                  })}
                </option>
              ))}
            </select>
            <div>
              <Button
                type="submit"
                className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
              >
                Incarca participantii
              </Button>
            </div>
          </form>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard
              icon={Gift}
              label="Eveniment selectat"
              value={selectedMatch?.title ?? "Neselectat"}
              compact
            />
            <MetricCard icon={UsersRound} label="Eligibili" value={candidates.length} />
            <MetricCard
              icon={ScanLine}
              label="Regula"
              value="scanare valida"
              compact
            />
          </div>
        </CardContent>
      </Card>

      {selectedMatch ? (
        <RaffleRandomizer candidates={candidates} />
      ) : (
        <Card className="rounded-[28px] border border-dashed border-black/10 bg-white/78">
          <CardContent className="p-8 text-sm text-neutral-600">
            Nu exista evenimente disponibile pentru tombola.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  compact = false,
}: {
  icon: typeof Gift;
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-black/6 bg-neutral-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
          <p className={compact ? "mt-1 text-sm font-semibold text-[#111111]" : "mt-1 text-3xl font-semibold text-[#111111]"}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function pickDefaultMatch(matches: Awaited<ReturnType<typeof getAdminMatchOverview>>) {
  const now = Date.now();
  const upcoming = matches
    .filter((match) => new Date(match.startsAt).getTime() >= now)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  if (upcoming[0]) {
    return upcoming[0];
  }

  return [...matches].sort(
    (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
  )[0];
}
