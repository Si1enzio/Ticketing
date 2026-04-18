"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, LockKeyhole, TicketPlus, UserRoundCog } from "lucide-react";
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
  { label: "Disponibil", className: "bg-[#11552d] text-white" },
  { label: "Selectat", className: "bg-[#d5a021] text-[#08140f]" },
  { label: "Rezervat / hold", className: "bg-slate-300 text-slate-700" },
  { label: "Blocat", className: "bg-red-100 text-red-700" },
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

    const diffMs =
      new Date(holdState.expiresAt).getTime() - now;
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
        toast.error(`Ai atins limita disponibilă de ${remainingLimit} bilete.`);
        return current;
      }

      return [...current, seatId];
    });
  }

  function requestHold() {
    if (!viewer.isAuthenticated) {
      toast.error("Autentifică-te pentru a bloca locurile.");
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
      toast.error("Nu există un hold activ pentru confirmare.");
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
      <Card className="border-[#e7dfbf] bg-white/95">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-heading text-4xl uppercase tracking-[0.1em] text-[#08140f]">
              Hartă interactivă
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
          <p className="text-sm leading-6 text-slate-600">
            Selectezi sectorul și locurile dorite, sistemul creează un hold cu expirare,
            apoi confirmi rezervarea și generezi biletele.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6">
          {sectors.map((sector) => (
            <div
              key={sector.sectorId}
              className="rounded-3xl border border-[#efe6c7] bg-[#fffdf6] p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
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
                <p className="text-xs text-slate-500">{sector.seats.length} locuri</p>
              </div>

              <div className="grid gap-3">
                {Object.entries(groupByRow(sector.seats)).map(([rowLabel, seats]) => (
                  <div key={rowLabel} className="grid grid-cols-[auto_1fr] items-center gap-3">
                    <div className="w-12 rounded-full bg-[#123826] px-3 py-2 text-center text-xs font-semibold text-[#f8d376]">
                      {rowLabel}
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-10">
                      {seats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.seatId);
                        const isDisabled =
                          seat.availability !== "available" && !isSelected;

                        return (
                          <button
                            key={seat.seatId}
                            type="button"
                            disabled={isDisabled || isPending}
                            onClick={() => toggleSeat(seat.seatId, seat.availability)}
                            className={cn(
                              "aspect-square rounded-2xl border text-xs font-semibold transition",
                              isSelected &&
                                "border-[#d5a021] bg-[#d5a021] text-[#08140f]",
                              !isSelected &&
                                seat.availability === "available" &&
                                "border-[#11552d]/30 bg-[#11552d] text-white hover:-translate-y-0.5",
                              !isSelected &&
                                (seat.availability === "reserved" ||
                                  seat.availability === "held") &&
                                "border-slate-300 bg-slate-200 text-slate-600",
                              !isSelected &&
                                (seat.availability === "blocked" ||
                                  seat.availability === "disabled" ||
                                  seat.availability === "obstructed" ||
                                  seat.availability === "internal") &&
                                "border-red-200 bg-red-50 text-red-700",
                            )}
                            title={`${sector.name} • Rând ${seat.rowLabel} • Loc ${seat.seatNumber}`}
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

      <Card className="border-[#d5a021]/20 bg-[#08140f] text-white">
        <CardHeader className="gap-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em]">
            Rezumat rezervare
          </CardTitle>
          <p className="text-sm leading-6 text-white/70">{matchTitle}</p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/72">
            {remainingLimit === null
              ? "Rol privilegiat: fără limită la emitere."
              : `Limita ta rămasă pentru acest meci: ${remainingLimit} bilete.`}
          </div>

          {viewer.reservationBlockedUntil ? (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
              Contul are restricții până la {new Date(viewer.reservationBlockedUntil).toLocaleString("ro-RO")}.
            </div>
          ) : null}

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#f8d376]">
              Locuri selectate
            </p>
            {selectedSeats.length ? (
              selectedSeats.map((seat) => (
                <div
                  key={seat.seatId}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm"
                >
                  <span>
                    {seat.sectorName} • Rând {seat.rowLabel} • Loc {seat.seatNumber}
                  </span>
                  <span className="text-white/60">{seat.gateName ?? "Fără poartă"}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/65">
                Nu ai selectat încă niciun loc.
              </p>
            )}
          </div>

          {holdState ? (
            <div className="rounded-3xl border border-[#d5a021]/25 bg-[#d5a021]/10 p-4 text-sm text-[#fff6dc]">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Hold activ. Expiră în aproximativ {countdown ?? "--:--"}.
              </div>
            </div>
          ) : null}

          {!viewer.isAuthenticated ? (
            <Button asChild className="rounded-full bg-[#d5a021] text-[#08140f] hover:bg-[#f0bd44]">
              <Link href={`/autentificare?next=/meciuri/${matchSlug}/rezerva`}>
                Autentifică-te pentru rezervare
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
                  Boolean(viewer.reservationBlockedUntil)
                }
                className="rounded-full bg-[#d5a021] text-[#08140f] hover:bg-[#f0bd44]"
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                Blochează provizoriu locurile
              </Button>
              <Button
                type="button"
                onClick={confirmHold}
                disabled={isPending || !holdState}
                className="rounded-full bg-[#11552d] hover:bg-[#0e4524]"
              >
                {viewer.isPrivileged ? (
                  <UserRoundCog className="mr-2 h-4 w-4" />
                ) : (
                  <TicketPlus className="mr-2 h-4 w-4" />
                )}
                Confirmă rezervarea
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
                Resetează selecția
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
