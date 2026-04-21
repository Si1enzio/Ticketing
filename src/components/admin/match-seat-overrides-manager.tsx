"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { SeatButton } from "@/components/stadium/seat-button";
import { StadiumLegend } from "@/components/stadium/stadium-legend";
import { StadiumMapRenderer } from "@/components/stadium/stadium-map-renderer";
import { StadiumTierView } from "@/components/stadium/stadium-tier-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  applyMatchSeatOverrideAction,
  releaseMatchSeatOverrideAction,
} from "@/lib/actions/admin";
import type {
  MatchSeatOverride,
  SeatMapSector,
} from "@/lib/domain/types";
import { resolveStadiumMapConfig } from "@/lib/stadium/stadium-config-registry";
import type { StadiumMapConfig } from "@/lib/stadium/stadium-types";
import {
  buildRenderableSectors,
  buildSeatRows,
  getSectorLabel,
  getVisibleTribunes,
  getTribuneLabel,
} from "@/lib/stadium/stadium-utils";

function getDefaultHoldUntil() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatOverrideStatus(override: MatchSeatOverride) {
  if (override.status === "blocked") {
    return "Blocat pe meci";
  }

  if (override.expiresAt) {
    return `Hold admin până la ${new Date(override.expiresAt).toLocaleString("ro-RO")}`;
  }

  return "Hold admin";
}

export function MatchSeatOverridesManager({
  matchId,
  stadiumId,
  stadiumName,
  sectors,
  overrides,
  stadiumMapConfig,
}: {
  matchId: string;
  stadiumId: string;
  stadiumName: string;
  sectors: SeatMapSector[];
  overrides: MatchSeatOverride[];
  stadiumMapConfig?: StadiumMapConfig | null;
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedTribuneId, setSelectedTribuneId] = useState<string | null>(null);
  const [selectedSectorCode, setSelectedSectorCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [holdUntil, setHoldUntil] = useState(getDefaultHoldUntil);
  const [isPending, startTransition] = useTransition();

  const resolvedMap = useMemo(
    () =>
      stadiumMapConfig
        ? { mapKey: stadiumMapConfig.mapKey, config: stadiumMapConfig, isFallback: false }
        : resolveStadiumMapConfig(
            {
              stadiumId,
              stadiumName,
            },
            sectors,
          ),
    [stadiumId, stadiumMapConfig, stadiumName, sectors],
  );

  const tribunes = useMemo(() => getVisibleTribunes(resolvedMap.config), [resolvedMap.config]);
  const renderableSectors = useMemo(
    () => buildRenderableSectors(resolvedMap.config, sectors, selectedSeatIds),
    [resolvedMap.config, sectors, selectedSeatIds],
  );

  const effectiveTribuneId = useMemo(() => {
    if (!tribunes.length) {
      return null;
    }

    if (selectedTribuneId && tribunes.some((tribune) => tribune.id === selectedTribuneId)) {
      return selectedTribuneId;
    }

    return tribunes[0].id;
  }, [selectedTribuneId, tribunes]);

  const effectiveSectorCode = useMemo(() => {
    const sectorsForTribune = renderableSectors.filter(
      (sector) => sector.config.tribuneId === effectiveTribuneId,
    );

    if (
      selectedSectorCode &&
      sectorsForTribune.some((sector) => sector.config.code === selectedSectorCode)
    ) {
      return selectedSectorCode;
    }

    return sectorsForTribune[0]?.config.code ?? renderableSectors[0]?.config.code ?? null;
  }, [effectiveTribuneId, renderableSectors, selectedSectorCode]);

  const selectedRenderableSector =
    renderableSectors.find((sector) => sector.config.code === effectiveSectorCode) ?? null;

  const seatRows = useMemo(() => {
    if (!selectedRenderableSector?.data) {
      return [];
    }

    return buildSeatRows(
      selectedRenderableSector.data,
      selectedSeatIds,
      selectedRenderableSector.config.rowConfigs,
    );
  }, [selectedRenderableSector, selectedSeatIds]);

  const overrideBySeatId = useMemo(
    () => new Map(overrides.map((override) => [override.seatId, override])),
    [overrides],
  );

  const selectedSeats = useMemo(
    () =>
      sectors
        .flatMap((sector) => sector.seats)
        .filter((seat) => selectedSeatIds.includes(seat.seatId)),
    [sectors, selectedSeatIds],
  );

  const selectedOverrides = useMemo(
    () =>
      selectedSeatIds
        .map((seatId) => overrideBySeatId.get(seatId))
        .filter((override): override is MatchSeatOverride => Boolean(override)),
    [overrideBySeatId, selectedSeatIds],
  );

  const hasPublicReservedSeats = selectedSeats.some((seat) => seat.availability === "reserved");
  const hasForeignHeldSeats = selectedSeats.some(
    (seat) => seat.availability === "held" && !overrideBySeatId.has(seat.seatId),
  );

  const canApplyOverride =
    selectedSeatIds.length > 0 && !isPending && !hasPublicReservedSeats && !hasForeignHeldSeats;
  const canReleaseOverride = selectedOverrides.length > 0 && !isPending;

  function handleSelectSector(sectorCode: string) {
    const nextSector = renderableSectors.find((sector) => sector.config.code === sectorCode);
    if (!nextSector) {
      return;
    }

    setSelectedSectorCode(sectorCode);
    setSelectedTribuneId(nextSector.config.tribuneId);
  }

  function toggleSeat(seatId: string) {
    setSelectedSeatIds((current) =>
      current.includes(seatId)
        ? current.filter((item) => item !== seatId)
        : [...current, seatId],
    );
  }

  function applyOverride(status: "blocked" | "admin_hold") {
    startTransition(async () => {
      const result = await applyMatchSeatOverrideAction({
        matchId,
        seatIds: selectedSeatIds,
        status,
        expiresAt: status === "admin_hold" ? holdUntil : undefined,
        note,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedSeatIds([]);
      setNote("");
      setHoldUntil(getDefaultHoldUntil());
      router.refresh();
    });
  }

  function releaseOverrides() {
    startTransition(async () => {
      const result = await releaseMatchSeatOverrideAction({
        matchId,
        seatIds: selectedSeatIds,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedSeatIds([]);
      setNote("");
      setHoldUntil(getDefaultHoldUntil());
      router.refresh();
    });
  }

  return (
    <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
      <CardHeader className="gap-4">
        <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
          Control locuri pe meci
        </CardTitle>
        <p className="max-w-4xl text-sm leading-6 text-neutral-600">
          Ca admin sau superadmin poti bloca locuri pentru acest meci, poti pune hold administrativ
          temporar si poti elibera override-urile deja aplicate. Aceste setari sunt valabile doar
          pentru meciul curent si nu modifica structura globala a stadionului.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
              Hartă operațională
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Alege sectorul, apoi selecteaza locurile pe care vrei sa le blochezi sau sa le tii in
              hold administrativ.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StadiumLegend mode="overview" />
            <StadiumLegend mode="seat-map" />
          </div>
        </div>

        <StadiumMapRenderer
          config={resolvedMap.config}
          sectors={renderableSectors}
          selectedSectorCode={effectiveSectorCode}
          isFallback={resolvedMap.isFallback}
          onSelectSector={handleSelectSector}
        />

        <StadiumTierView
          tribunes={tribunes}
          selectedTribuneId={effectiveTribuneId}
          selectedSectorCode={effectiveSectorCode}
          sectors={renderableSectors}
          onSelectTribune={setSelectedTribuneId}
          onSelectSector={handleSelectSector}
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
                  Sector activ
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {selectedRenderableSector
                    ? `${getTribuneLabel(
                        locale,
                        tribunes.find((tribune) => tribune.id === effectiveTribuneId) ?? tribunes[0],
                      )} / ${getSectorLabel(locale, selectedRenderableSector.config)}`
                    : "Alege un sector din hartă."}
                </p>
              </div>
              <div className="rounded-[22px] border border-black/6 bg-white px-4 py-3 text-sm text-neutral-600">
                {selectedSeatIds.length} locuri selectate
              </div>
            </div>

            {selectedRenderableSector?.data ? (
              <div className="grid gap-3">
                {seatRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[auto_1fr] items-start gap-3">
                    <div className="w-16 rounded-full bg-[#111111] px-3 py-2 text-center text-xs font-semibold text-white">
                      Rand {row.label}
                    </div>
                    <div className="overflow-x-auto pb-2">
                      <div className="grid min-w-max grid-flow-col auto-cols-[2.75rem] gap-2 sm:auto-cols-[3rem]">
                        {row.cells.map((cell) => {
                          if (cell.kind !== "seat") {
                            return (
                              <div
                                key={cell.key}
                                className="h-11 w-11 rounded-2xl border border-dashed border-black/6 bg-transparent sm:h-12 sm:w-12"
                                aria-hidden="true"
                              />
                            );
                          }

                          return (
                            <SeatButton
                              key={cell.key}
                              label={cell.seat.seatNumber}
                              status={cell.status}
                              disabled={isPending}
                              onClick={() => toggleSeat(cell.seat.seatId)}
                              title={`Rand ${cell.seat.rowLabel} - Loc ${cell.seat.seatNumber}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-white/80 p-5 text-sm text-neutral-600">
                Selecteaza mai intai un sector din harta pentru a administra locurile lui.
              </div>
            )}
          </div>

          <div className="grid gap-4 self-start rounded-[28px] border border-black/6 bg-neutral-50 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
                Acțiuni pe selecție
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Foloseste blocarea cand vrei sa inchizi locul pentru vanzarea publica. Foloseste
                hold administrativ cand vrei sa il tii indisponibil doar pana la o ora stabilita.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="match-seat-override-note">Notă internă</Label>
              <Textarea
                id="match-seat-override-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex: protocol, invitați, rezervă pentru sponsor, verificare în curs"
                className="min-h-24 rounded-2xl bg-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="match-seat-override-hold-until">Hold administrativ până la</Label>
              <Input
                id="match-seat-override-hold-until"
                type="datetime-local"
                value={holdUntil}
                onChange={(event) => setHoldUntil(event.target.value)}
                className="rounded-2xl bg-white"
              />
            </div>

            <div className="grid gap-3">
              <Button
                type="button"
                onClick={() => applyOverride("blocked")}
                disabled={!canApplyOverride}
                className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
              >
                Blochează locurile pentru acest meci
              </Button>
              <Button
                type="button"
                onClick={() => applyOverride("admin_hold")}
                disabled={!canApplyOverride}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Pune hold administrativ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={releaseOverrides}
                disabled={!canReleaseOverride}
                className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
              >
                Eliberează override-ul
              </Button>
            </div>

            {hasPublicReservedSeats ? (
              <div className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] p-4 text-sm leading-6 text-[#b91c1c]">
                În selecția curentă există locuri cu bilete deja emise sau folosite. Acestea nu pot
                fi suprascrise din admin.
              </div>
            ) : null}

            {hasForeignHeldSeats ? (
              <div className="rounded-[24px] border border-[#fde68a] bg-[#fffbeb] p-4 text-sm leading-6 text-[#92400e]">
                Unele locuri selectate au hold-uri active din fluxul public. Așteaptă expirarea lor
                sau schimbă selecția.
              </div>
            ) : null}

            <div className="grid gap-3 rounded-[26px] border border-black/6 bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                Locuri selectate
              </p>
              {selectedSeats.length ? (
                selectedSeats.map((seat) => {
                  const override = overrideBySeatId.get(seat.seatId);

                  return (
                    <div
                      key={seat.seatId}
                      className="rounded-2xl border border-black/6 bg-neutral-50 px-3 py-3 text-sm text-neutral-700"
                    >
                      <p className="font-semibold text-[#111111]">
                        {seat.sectorName} / Rand {seat.rowLabel} / Loc {seat.seatNumber}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                        Status public: {seat.availability}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {override ? formatOverrideStatus(override) : "Fără override per meci"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-neutral-600">
                  Selecteaza locurile direct din sectorul ales. Poti selecta si locuri deja blocate
                  pentru a le elibera.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
