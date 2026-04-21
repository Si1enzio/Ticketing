"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveMatchSectorPricingAction } from "@/lib/actions/admin";
import type { MatchSectorPricingOverride, SeatMapSector } from "@/lib/domain/types";
import { formatCurrencyFromCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MatchSectorPricingManager({
  matchId,
  ticketingMode,
  baseTicketPriceCents,
  currency,
  sectors,
  pricingOverrides,
}: {
  matchId: string;
  ticketingMode: "free" | "paid";
  baseTicketPriceCents: number;
  currency: string;
  sectors: SeatMapSector[];
  pricingOverrides: MatchSectorPricingOverride[];
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pricingOverrides.map((item) => [
        item.sectorId,
        item.ticketPriceCentsOverride === null ? "" : String(item.ticketPriceCentsOverride),
      ]),
    ),
  );

  const sectorRows = useMemo(
    () =>
      [...sectors].sort((left, right) => {
        const byCode = left.code.localeCompare(right.code, "ro");
        if (byCode !== 0) {
          return byCode;
        }

        return left.name.localeCompare(right.name, "ro");
      }),
    [sectors],
  );

  function updateDraft(sectorId: string, value: string) {
    setDraft((current) => ({
      ...current,
      [sectorId]: value,
    }));
  }

  function savePricing() {
    startTransition(async () => {
      const result = await saveMatchSectorPricingAction({
        matchId,
        pricing: sectorRows.map((sector) => {
          const rawValue = (draft[sector.sectorId] ?? "").trim();

          return {
            sectorId: sector.sectorId,
            ticketPriceCentsOverride: rawValue === "" ? null : Number(rawValue),
          };
        }),
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
    });
  }

  return (
    <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
      <CardHeader className="gap-4">
        <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
          Preturi pe sectoare
        </CardTitle>
        <p className="max-w-4xl text-sm leading-6 text-neutral-600">
          Pretul de baza al meciului este{" "}
          <span className="font-semibold text-[#111111]">
            {formatCurrencyFromCents(baseTicketPriceCents, currency)}
          </span>
          . Pentru sectoarele unde completezi un pret in bani, sistemul va folosi acel override in
          selectie, checkout si plata demo. Campul gol inseamna „foloseste pretul de baza”.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5">
        {ticketingMode !== "paid" ? (
          <div className="rounded-[24px] border border-dashed border-black/10 bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
            Acest meci este configurat momentan ca gratuit. Poti pregati preturile pe sectoare in
            avans, dar ele vor fi folosite doar dupa ce schimbi meciul pe ticketing cu plata.
          </div>
        ) : null}

        <div className="grid gap-3">
          {sectorRows.map((sector) => {
            const rawValue = draft[sector.sectorId] ?? "";
            const hasOverride = rawValue.trim() !== "";
            const effectiveLabel = hasOverride
              ? formatCurrencyFromCents(Number(rawValue), currency)
              : formatCurrencyFromCents(baseTicketPriceCents, currency);

            return (
              <div
                key={sector.sectorId}
                className="grid gap-3 rounded-[24px] border border-black/6 bg-neutral-50 px-4 py-4 lg:grid-cols-[1.1fr_0.8fr_0.7fr]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: sector.color }}
                  />
                  <div>
                    <p className="font-semibold text-[#111111]">
                      {sector.code} / {sector.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {sector.seats.length} locuri in structura curenta
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`sector-price-${sector.sectorId}`}>Pret override (bani)</Label>
                  <Input
                    id={`sector-price-${sector.sectorId}`}
                    type="number"
                    min={0}
                    step={1}
                    value={rawValue}
                    onChange={(event) => updateDraft(sector.sectorId, event.target.value)}
                    placeholder={`Ex: ${baseTicketPriceCents}`}
                    className="rounded-2xl bg-white"
                  />
                </div>

                <div className="rounded-[22px] border border-black/6 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                    Pret efectiv
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#111111]">{effectiveLabel}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={savePricing}
            disabled={isPending}
            className="rounded-full border border-[#dc2626] bg-[#dc2626] px-6 text-white hover:bg-[#b91c1c]"
          >
            Salveaza preturile pe sectoare
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
