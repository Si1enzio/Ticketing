"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock3,
  LockKeyhole,
  ShoppingCart,
  ShieldAlert,
  TicketPlus,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { confirmSeatHoldAction, holdSeatsAction } from "@/lib/actions/reservations";
import type { SeatMapSector, ViewerContext } from "@/lib/domain/types";
import { formatCurrencyFromCents } from "@/lib/utils";
import { StadiumMap } from "@/components/stadium/stadium-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HoldState = {
  holdToken: string;
  expiresAt: string;
};

export function SeatMapBoard({
  matchId,
  matchSlug,
  matchTitle,
  stadiumId,
  stadiumName,
  sectors,
  viewer,
  remainingLimit,
  ticketingMode,
  ticketPriceCents,
  currency,
}: {
  matchId: string;
  matchSlug: string;
  matchTitle: string;
  stadiumId: string;
  stadiumName: string;
  sectors: SeatMapSector[];
  viewer: ViewerContext;
  remainingLimit: number | null;
  ticketingMode: "free" | "paid";
  ticketPriceCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [holdState, setHoldState] = useState<HoldState | null>(null);
  const [now, setNow] = useState(0);
  const [isPending, startTransition] = useTransition();
  const isPaidFlow = ticketingMode === "paid" && !viewer.isPrivileged;
  const isTicketingDisabled = Boolean(viewer.reservationBlockedUntil);

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
      toast.error("Autentifica-te pentru a continua ticketing-ul.");
      return;
    }

    if (isTicketingDisabled) {
      toast.error(
        "Contul tau nu poate continua ticketing-ul pentru acest meci.",
      );
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

      if (result.ticketingMode === "paid" && !viewer.isPrivileged) {
        toast.success("Locurile au fost blocate. Continua imediat spre plata.");
        router.push(`/meciuri/${matchSlug}/checkout?hold=${result.holdToken}`);
        router.refresh();
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
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
            Harta stadionului si locurilor
          </CardTitle>
          <p className="max-w-3xl text-sm leading-6 text-neutral-600">
            {ticketingMode === "paid"
              ? `Acest meci foloseste procurare cu plata. Selectezi locurile, le blochezi temporar, apoi continui spre checkout pentru emiterea biletelor QR. Pretul curent este ${formatCurrencyFromCents(ticketPriceCents, currency)} pe loc.`
              : "Acest meci foloseste emitere gratuita. Selectezi locurile, le blochezi temporar pentru cateva minute, apoi confirmi emiterea biletelor QR."}
          </p>
        </CardHeader>
        <CardContent className="grid gap-6">
          <StadiumMap
            stadiumId={stadiumId}
            stadiumName={stadiumName}
            sectors={sectors}
            selectedSeatIds={selectedSeatIds}
            disabled={isPending || isTicketingDisabled}
            onSeatToggle={toggleSeat}
          />
        </CardContent>
      </Card>

      <Card className="surface-dark overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.24),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardHeader className="gap-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em]">
            {ticketingMode === "paid" && !viewer.isPrivileged
              ? "Procura bilete"
              : "Emitere bilete"}
          </CardTitle>
          <p className="text-sm leading-6 text-white/72">{matchTitle}</p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {remainingLimit === null
              ? "Rol privilegiat: poti emite fara limita standard."
              : `Limita ta ramasa pentru acest meci: ${remainingLimit} bilete.`}
          </div>

          {ticketingMode === "paid" ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/85">
              Pret pe loc: <span className="font-semibold">{formatCurrencyFromCents(ticketPriceCents, currency)}</span>
              . Totalul final se calculeaza automat la checkout.
            </div>
          ) : null}

          {!viewer.isAuthenticated ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/80">
              Autentifica-te mai intai, apoi revii direct in aceasta pagina pentru a continua selectia.
            </div>
          ) : null}

          {viewer.reservationBlockedUntil ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/80">
              Contul are restrictii pana la{" "}
              {new Date(viewer.reservationBlockedUntil).toLocaleString("ro-RO")}.
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
                  <span className="text-right text-white/55">
                    {ticketingMode === "paid"
                      ? formatCurrencyFromCents(ticketPriceCents, currency)
                      : "Acces gratuit"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/65">Nu ai selectat inca niciun loc.</p>
            )}
          </div>

          {selectedSeats.length && ticketingMode === "paid" ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              Total estimat:{" "}
              <span className="font-semibold text-white">
                {formatCurrencyFromCents(ticketPriceCents * selectedSeats.length, currency)}
              </span>
            </div>
          ) : null}

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
                {ticketingMode === "paid"
                  ? "Autentifica-te pentru a procura"
                  : "Autentifica-te pentru emitere"}
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
                  isTicketingDisabled
                }
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                {ticketingMode === "paid" && !viewer.isPrivileged
                  ? "Blocheaza locurile si continua la plata"
                  : "Blocheaza temporar locurile"}
              </Button>
              <Button
                type="button"
                onClick={confirmHold}
                disabled={isPending || !holdState || isTicketingDisabled || isPaidFlow}
                className="rounded-full border border-white/10 bg-white text-[#111111] hover:bg-neutral-100"
              >
                {viewer.isPrivileged ? (
                  <UserRoundCog className="mr-2 h-4 w-4" />
                ) : isPaidFlow ? (
                  <ShoppingCart className="mr-2 h-4 w-4" />
                ) : (
                  <TicketPlus className="mr-2 h-4 w-4" />
                )}
                {isPaidFlow ? "Continua la plata" : "Confirma emiterea biletelor"}
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
