"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock3,
  LockKeyhole,
  ShieldAlert,
  TicketPlus,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { confirmSeatHoldAction, holdSeatsAction } from "@/lib/actions/reservations";
import type { SeatMapSector, ViewerContext } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HoldState = {
  holdToken: string;
  expiresAt: string;
};

const legendItems = [
  { label: "Disponibil", className: "bg-[#111111] text-white" },
  { label: "Selectat", className: "bg-[#dc2626] text-white" },
  { label: "Blocat temporar", className: "bg-neutral-200 text-neutral-700" },
  { label: "Indisponibil", className: "bg-[#fee2e2] text-[#b91c1c]" },
] as const;

export function SeatMapBoard({
  matchId,
  matchSlug,
  matchTitle,
  sectors,
  viewer,
  remainingLimit,
}: {
  matchId: string;
  matchSlug: string;
  matchTitle: string;
  sectors: SeatMapSector[];
  viewer: ViewerContext;
  remainingLimit: number | null;
}) {
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [holdState, setHoldState] = useState<HoldState | null>(null);
  const [now, setNow] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isReservationDisabled =
    Boolean(viewer.reservationBlockedUntil) ||
    (!viewer.isPrivileged && viewer.isAuthenticated && !viewer.canReserve);

  useEffect(() => {
    if (!holdState?.expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [holdState]);

  const selectedSeats = useMemo(
    () =>
      sectors
        .flatMap((sector) => sector.seats)
        .filter((seat) => selectedSeatIds.includes(seat.seatId)),
    [selectedSeatIds, sectors],
  );

  const countdown = useMemo(() => {
    if (!holdState?.expiresAt) {
      return null;
    }

    const diffMs = new Date(holdState.expiresAt).getTime() - now;
    const totalSeconds = Math.max(Math.floor(diffMs / 1000), 0);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [holdState, now]);

  function toggleSeat(seatId: string, seatAvailability: string) {
    if (seatAvailability !== "available" && !selectedSeatIds.includes(seatId)) {
      return;
    }

    setSelectedSeatIds((current) => {
      if (current.includes(seatId)) {
        return current.filter((item) => item !== seatId);
      }

      if (remainingLimit !== null && current.length >= remainingLimit) {
        toast.error(`Ai atins limita disponibila de ${remainingLimit} bilete.`);
        return current;
      }

      return [...current, seatId];
    });
  }

  function requestHold() {
    if (!viewer.isAuthenticated) {
      toast.error("Autentifica-te pentru a continua.");
      return;
    }

    if (isReservationDisabled) {
      toast.error("Contul tau nu poate solicita bilete pentru acest meci.");
      return;
    }

    startTransition(async () => {
      const result = await holdSeatsAction({
        matchId,
        seatIds: selectedSeatIds,
      });

      if (!result.ok || !result.holdToken || !result.expiresAt) {
        toast.error(result.message);
        return;
      }

      setHoldState({
        holdToken: result.holdToken,
        expiresAt: result.expiresAt,
      });
      setNow(Date.now());
      toast.success(result.message);
    });
  }

  function confirmHold() {
    if (!holdState?.holdToken) {
      toast.error("Nu exista un hold activ pentru confirmare.");
      return;
    }

    startTransition(async () => {
      const result = await confirmSeatHoldAction({
        matchId,
        holdToken: holdState.holdToken,
        source: viewer.isPrivileged ? "admin_reservation" : "public_reservation",
      });

      if (!result.ok || !result.reservationId) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(`/confirmare/${result.reservationId}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Harta locurilor
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {legendItems.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${item.className}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-neutral-600">
            In acest MVP biletele sunt gratuite, deci fluxul este de solicitare si emitere,
            nu de cumparare. Selectezi locurile, le blochezi temporar, apoi confirmi
            emiterea biletelor QR.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6">
          {sectors.map((sector) => (
            <div
              key={sector.sectorId}
              className="rounded-[28px] border border-black/6 bg-neutral-50 p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
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
                <p className="text-xs text-neutral-500">{sector.seats.length} locuri</p>
              </div>

              <div className="grid gap-3">
                {Object.entries(groupByRow(sector.seats)).map(([rowLabel, seats]) => (
                  <div key={rowLabel} className="grid grid-cols-[auto_1fr] items-center gap-3">
                    <div className="w-12 rounded-full bg-[#111111] px-3 py-2 text-center text-xs font-semibold text-white">
                      {rowLabel}
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-10">
                      {seats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.seatId);
                        const isDisabled =
                          seat.availability !== "available" && !selectedSeatIds.includes(seat.seatId);

                        return (
                          <button
                            key={seat.seatId}
                            type="button"
                            disabled={isDisabled || isPending || isReservationDisabled}
                            onClick={() => toggleSeat(seat.seatId, seat.availability)}
                            className={cn(
                              "aspect-square rounded-2xl border text-xs font-semibold transition",
                              isSelected &&
                                "border-[#dc2626] bg-[#dc2626] text-white shadow-[0_16px_30px_-18px_rgba(220,38,38,0.85)]",
                              !isSelected &&
                                seat.availability === "available" &&
                                "border-black/10 bg-white text-[#111111] hover:-translate-y-0.5 hover:border-[#dc2626]/35 hover:text-[#b91c1c]",
                              !isSelected &&
                                (seat.availability === "reserved" ||
                                  seat.availability === "held") &&
                                "border-neutral-300 bg-neutral-200 text-neutral-600",
                              !isSelected &&
                                (seat.availability === "blocked" ||
                                  seat.availability === "disabled" ||
                                  seat.availability === "obstructed" ||
                                  seat.availability === "internal") &&
                                "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
                            )}
                            title={`${sector.name} - Rand ${seat.rowLabel} - Loc ${seat.seatNumber}`}
                          >
                            {seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="surface-dark overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.24),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardHeader className="gap-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em]">
            Emitere bilete
          </CardTitle>
          <p className="text-sm leading-6 text-white/72">{matchTitle}</p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {remainingLimit === null
              ? "Rol privilegiat: poti emite fara limita standard."
              : `Limita ta ramasa pentru acest meci: ${remainingLimit} bilete.`}
          </div>

          {!viewer.isAuthenticated ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/80">
              Autentifica-te mai intai, apoi revii direct in aceasta pagina pentru a
              continua selectia.
            </div>
          ) : null}

          {viewer.reservationBlockedUntil ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/80">
              Contul are restrictii pana la{" "}
              {new Date(viewer.reservationBlockedUntil).toLocaleString("ro-RO")}.
            </div>
          ) : null}

          {viewer.isAuthenticated && !viewer.isPrivileged && !viewer.canReserve ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/80">
              Solicitarea biletelor gratuite este dezactivata pentru acest cont. Un admin
              trebuie sa iti acorde dreptul de acces.
            </div>
          ) : null}

          <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#fecaca]">
              Locuri selectate
            </p>
            {selectedSeats.length ? (
              selectedSeats.map((seat) => (
                <div
                  key={seat.seatId}
                  className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2 text-sm"
                >
                  <span>
                    {seat.sectorName} - Rand {seat.rowLabel} - Loc {seat.seatNumber}
                  </span>
                  <span className="text-white/55">{seat.gateName ?? "Fara poarta"}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/65">Nu ai selectat inca niciun loc.</p>
            )}
          </div>

          {holdState ? (
            <div className="rounded-[26px] border border-white/10 bg-white/8 p-4 text-sm text-white">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#fca5a5]" />
                Hold activ. Expira in aproximativ {countdown ?? "--:--"}.
              </div>
            </div>
          ) : null}

          {!viewer.isAuthenticated ? (
            <Button
              asChild
              className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              <Link href={`/autentificare?next=/meciuri/${matchSlug}/rezerva`}>
                Autentifica-te pentru a continua
              </Link>
            </Button>
          ) : (
            <div className="grid gap-3">
              <Button
                type="button"
                onClick={requestHold}
                disabled={
                  isPending ||
                  !selectedSeatIds.length ||
                  Boolean(holdState) ||
                  isReservationDisabled
                }
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                Blocheaza locurile pentru emitere
              </Button>
              <Button
                type="button"
                onClick={confirmHold}
                disabled={isPending || !holdState || isReservationDisabled}
                className="rounded-full border border-white/10 bg-white text-[#111111] hover:bg-neutral-100"
              >
                {viewer.isPrivileged ? (
                  <UserRoundCog className="mr-2 h-4 w-4" />
                ) : (
                  <TicketPlus className="mr-2 h-4 w-4" />
                )}
                Confirma emiterea biletelor
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedSeatIds([]);
                  setHoldState(null);
                  setNow(0);
                }}
                disabled={isPending}
                className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Reseteaza selectia
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function groupByRow<T extends { rowLabel: string }>(seats: T[]) {
  return seats.reduce<Record<string, T[]>>((acc, seat) => {
    acc[seat.rowLabel] = acc[seat.rowLabel] ? [...acc[seat.rowLabel], seat] : [seat];
    return acc;
  }, {});
}
