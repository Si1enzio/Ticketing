"use client";

import { useMemo, useState } from "react";
import { Copy, Dices, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RaffleCandidate } from "@/lib/domain/types";
import { formatSeatPosition } from "@/lib/format/seat";

export function RaffleRandomizer({
  candidates,
}: {
  candidates: RaffleCandidate[];
}) {
  const [winnerCount, setWinnerCount] = useState(1);
  const [winners, setWinners] = useState<RaffleCandidate[]>([]);
  const maxWinners = Math.min(20, candidates.length);
  const canDraw = candidates.length > 0;
  const participantLabel = candidates.length === 1 ? "participant validat" : "participanti validati";

  const csvText = useMemo(() => {
    const header = ["#", "Nume", "Cod", "Pozitie loc", "Sector", "Tribuna", "Poarta", "Scanat la"];
    const rows = winners.map((winner, index) => [
      String(index + 1),
      getDisplayName(winner),
      winner.code,
      getSeatLabel(winner),
      winner.sectorName ?? "",
      winner.standName ?? "",
      winner.gateName ?? "",
      new Date(winner.scannedAt).toLocaleString("ro-RO"),
    ]);

    return [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
  }, [winners]);

  function drawWinners() {
    if (!canDraw) {
      return;
    }

    const safeCount = Math.min(Math.max(winnerCount, 1), maxWinners);
    const shuffled = shuffleWithCrypto(candidates);
    setWinners(shuffled.slice(0, safeCount));
  }

  async function copyWinners() {
    if (!winners.length) {
      return;
    }

    await navigator.clipboard.writeText(csvText);
    toast.success("Lista castigatorilor a fost copiata.");
  }

  return (
    <div className="grid gap-5">
      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
                Randomizer tombola
              </p>
              <h2 className="mt-2 font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Alege castigatorii
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Intra in selectie doar biletele sau abonamentele scanate valid pentru meciul ales.
              </p>
            </div>

            <div className="rounded-[24px] border border-black/6 bg-neutral-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Eligibili acum
              </p>
              <p className="mt-2 text-4xl font-semibold text-[#111111]">{candidates.length}</p>
              <p className="mt-1 text-sm text-neutral-600">{participantLabel}</p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-[#111111]">
              Numar castigatori
              <input
                type="number"
                min={1}
                max={Math.max(maxWinners, 1)}
                value={winnerCount}
                onChange={(event) => setWinnerCount(Number(event.target.value))}
                className="h-12 rounded-full border border-black/10 bg-white px-4 text-base outline-none transition focus:border-[#dc2626]"
              />
              <span className="text-xs font-normal text-neutral-500">
                Poti alege intre 1 si {Math.max(maxWinners, 1)} pentru acest meci.
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={drawWinners}
                disabled={!canDraw}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                <Dices className="mr-2 h-4 w-4" />
                Extrage
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWinners([])}
                disabled={!winners.length}
                className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reseteaza
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={copyWinners}
                disabled={!winners.length}
                className="rounded-full border-[#dc2626]/18 bg-[#fff1f2] text-[#b91c1c] hover:bg-[#fee2e2]"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiaza CSV
              </Button>
            </div>
          </div>

          <div className="rounded-[28px] border border-black/6 bg-neutral-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                  Castigatori
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Lista se genereaza local in browser si poate fi reextrasa.
                </p>
              </div>
              <Trophy className="h-8 w-8 text-[#dc2626]" />
            </div>

            {winners.length ? (
              <div className="grid gap-3">
                {winners.map((winner, index) => (
                  <WinnerCard key={winner.id} winner={winner} index={index} />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-white p-6 text-sm leading-6 text-neutral-600">
                Inca nu ai extras castigatori. Alege numarul si apasa pe butonul Extrage.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-[#dc2626]/12 bg-[#fff7f7]">
        <CardContent className="space-y-2 p-5 text-sm leading-6 text-neutral-700">
          <p className="font-semibold text-[#111111]">Idei utile pentru concursuri corecte</p>
          <p>
            Recomand sa anunti regula inainte de extragere: o intrare validata = o sansa.
            Daca vrei o singura sansa per persoana, trebuie sa colectam numele participantului
            real pe fiecare bilet, nu doar contul care a procurat biletele.
          </p>
          <p>
            Pentru audit, putem adauga ulterior salvarea extragerii in baza de date, cu timestamp,
            admin, lista eligibila si lista castigatorilor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WinnerCard({ winner, index }: { winner: RaffleCandidate; index: number }) {
  return (
    <div className="rounded-[24px] border border-black/6 bg-white p-4 shadow-[0_16px_50px_-40px_rgba(17,17,17,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#b91c1c]">
            Castigator #{index + 1}
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">{getDisplayName(winner)}</p>
        </div>
        <p className="rounded-full border border-black/8 bg-neutral-50 px-3 py-1 text-sm font-semibold text-[#111111]">
          {winner.code}
        </p>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
        <p>Pozitie: {getSeatLabel(winner)}</p>
        <p>Sector: {winner.sectorName ?? "-"}</p>
        <p>Tribuna: {winner.standName ?? "-"}</p>
        <p>Poarta: {winner.gateName ?? "-"}</p>
        <p>Tip: {winner.credentialKind === "subscription" ? "Abonament" : "Bilet"}</p>
        <p>Scanat: {new Date(winner.scannedAt).toLocaleString("ro-RO")}</p>
      </div>
    </div>
  );
}

function getDisplayName(candidate: RaffleCandidate) {
  return candidate.holderName ?? candidate.holderEmail ?? "Suporter fara nume";
}

function getSeatLabel(candidate: RaffleCandidate) {
  return formatSeatPosition(candidate);
}

function shuffleWithCrypto<T>(items: T[]) {
  const result = [...items];
  const randomValues = new Uint32Array(result.length);
  window.crypto.getRandomValues(randomValues);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = randomValues[index] % (index + 1);
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}
