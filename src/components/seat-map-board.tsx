"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShoppingCart,
  TicketPlus,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { formatDateTimeInTimeZone } from "@/lib/date-time";
import type { SeatMapSector, ViewerContext } from "@/lib/domain/types";
import type { StadiumMapConfig } from "@/lib/stadium/stadium-types";
import { formatCurrencyFromCents } from "@/lib/utils";
import { StadiumMap } from "@/components/stadium/stadium-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HoldState = {
  holdToken: string;
  expiresAt: string;
  holdType: "initial" | "confirmed_free" | "confirmed_paid";
};

type HoldConfig = {
  initialHoldSeconds: number;
  freeTicketConfirmedHoldSeconds: number;
  paidTicketConfirmedHoldSeconds: number;
  allowGuestHold: boolean;
  requireLoginBeforeHold: boolean;
};

type HoldSummaryPayload = {
  hold_token?: string | null;
  expires_at?: string | null;
  hold_type?: HoldState["holdType"] | null;
  seat_ids?: string[] | null;
} | null;

function normalizeHoldPayload(summary: HoldSummaryPayload) {
  if (!summary?.hold_token || !summary?.expires_at || !summary?.hold_type) {
    return {
      holdState: null,
      seatIds: [] as string[],
    };
  }

  return {
    holdState: {
      holdToken: summary.hold_token,
      expiresAt: summary.expires_at,
      holdType: summary.hold_type,
    } satisfies HoldState,
    seatIds: summary.seat_ids ?? [],
  };
}

export function SeatMapBoard({
  matchId,
  matchSlug,
  matchTitle,
  stadiumId,
  stadiumName,
  stadiumMapConfig,
  sectors,
  viewer,
  remainingLimit,
  ticketingMode,
  ticketPriceCents,
  currency,
  initialSelectedSeatIds,
  isSuperadmin,
  initialHoldState,
  holdConfig,
}: {
  matchId: string;
  matchSlug: string;
  matchTitle: string;
  stadiumId: string;
  stadiumName: string;
  stadiumMapConfig?: StadiumMapConfig | null;
  sectors: SeatMapSector[];
  viewer: ViewerContext;
  remainingLimit: number | null;
  ticketingMode: "free" | "paid";
  ticketPriceCents: number;
  currency: string;
  initialSelectedSeatIds: string[];
  isSuperadmin: boolean;
  initialHoldState: HoldState | null;
  holdConfig: HoldConfig;
}) {
  const router = useRouter();
  const selectedSeatIdsSignature = initialSelectedSeatIds.join(",");
  const holdStateSignature = initialHoldState
    ? `${initialHoldState.holdToken}:${initialHoldState.expiresAt}:${initialHoldState.holdType}`
    : "none";
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(initialSelectedSeatIds);
  const [selectedSeatIdsSyncSignature, setSelectedSeatIdsSyncSignature] = useState(
    selectedSeatIdsSignature,
  );
  const [holdState, setHoldState] = useState<HoldState | null>(initialHoldState);
  const [holdStateSyncSignature, setHoldStateSyncSignature] = useState(holdStateSignature);
  const [pendingSeatIds, setPendingSeatIds] = useState<string[]>([]);
  const [now, setNow] = useState(() => new Date().getTime());
  const [isPending, startTransition] = useTransition();
  const isPaidFlow = ticketingMode === "paid" && !viewer.isPrivileged;
  const isTicketingDisabled = Boolean(viewer.reservationBlockedUntil);
  const requiresLoginBeforeHold =
    holdConfig.requireLoginBeforeHold || !holdConfig.allowGuestHold;
  const holdDurationLabelSeconds =
    holdState?.holdType === "confirmed_paid"
      ? holdConfig.paidTicketConfirmedHoldSeconds
      : holdState?.holdType === "confirmed_free"
        ? holdConfig.freeTicketConfirmedHoldSeconds
        : holdConfig.initialHoldSeconds;

  if (selectedSeatIdsSyncSignature !== selectedSeatIdsSignature) {
    setSelectedSeatIdsSyncSignature(selectedSeatIdsSignature);
    setSelectedSeatIds(initialSelectedSeatIds);
  }

  if (holdStateSyncSignature !== holdStateSignature) {
    setHoldStateSyncSignature(holdStateSignature);
    setHoldState(initialHoldState);
  }

  useEffect(() => {
    if (!holdState?.expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(new Date().getTime());
    }, 1000);
    const expiryDelay = Math.max(new Date(holdState.expiresAt).getTime() - new Date().getTime(), 0);
    const timeout = window.setTimeout(() => {
      setHoldState(null);
      setSelectedSeatIds([]);
      toast.error("Timpul de rezervare temporara a expirat. Te rugam sa selectezi din nou locurile disponibile.");
      router.refresh();
    }, expiryDelay);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [holdState, router]);

  const selectedSeats = useMemo(
    () =>
      sectors
        .flatMap((sector) => sector.seats)
        .filter((seat) => selectedSeatIds.includes(seat.seatId)),
    [selectedSeatIds, sectors],
  );

  const estimatedTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.ticketPriceCents, 0),
    [selectedSeats],
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

  async function callHoldEndpoint(
    endpoint: "/api/holds/acquire" | "/api/holds/release" | "/api/holds/extend",
    payload: Record<string, unknown>,
  ) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string; summary?: HoldSummaryPayload }
      | null;

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.message ??
          "Locul nu a putut fi actualizat acum. Reincarca pagina si incearca din nou.",
      );
    }

    return data;
  }

  async function toggleSeat(seatId: string, seatAvailability: string) {
    if (pendingSeatIds.includes(seatId) || isTicketingDisabled) {
      return;
    }

    if (!viewer.isAuthenticated && requiresLoginBeforeHold) {
      toast.error("Autentifica-te pentru a putea bloca locurile temporar.");
      return;
    }

    if (
      seatAvailability !== "available" &&
      seatAvailability !== "held_by_me" &&
      !selectedSeatIds.includes(seatId)
    ) {
      return;
    }

    if (
      seatAvailability === "available" &&
      remainingLimit !== null &&
      selectedSeatIds.length >= remainingLimit
    ) {
      toast.error(`Ai atins limita disponibila de ${remainingLimit} bilete.`);
      return;
    }

    setPendingSeatIds((current) => [...current, seatId]);

    try {
      const isAlreadyMine = selectedSeatIds.includes(seatId) || seatAvailability === "held_by_me";
      const result = isAlreadyMine
        ? await callHoldEndpoint("/api/holds/release", {
            matchId,
            seatId,
            holdToken: holdState?.holdToken ?? null,
          })
        : await callHoldEndpoint("/api/holds/acquire", {
            matchId,
            seatId,
          });

      const normalized = normalizeHoldPayload(result.summary ?? null);
      setSelectedSeatIds(normalized.seatIds);
      setHoldState(normalized.holdState);
      setNow(Date.now());

      if (isAlreadyMine) {
        toast.success("Locul a fost eliberat imediat.");
      } else {
        toast.success("Locul a fost blocat temporar pentru tine.");
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Acest loc tocmai a fost selectat de alt utilizator. Te rugam sa alegi alt loc.",
      );
      router.refresh();
    } finally {
      setPendingSeatIds((current) => current.filter((item) => item !== seatId));
    }
  }

  function continueWithSelection() {
    if (!holdState?.holdToken) {
      toast.error("Selecteaza si blocheaza mai intai cel putin un loc disponibil.");
      return;
    }

    if (!viewer.isAuthenticated) {
      toast.error("Autentifica-te pentru a continua catre confirmare.");
      router.push(`/autentificare?next=/meciuri/${matchSlug}/checkout?hold=${holdState.holdToken}`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await callHoldEndpoint("/api/holds/extend", {
          matchId,
          holdToken: holdState.holdToken,
        });
        const normalized = normalizeHoldPayload(result.summary ?? null);
        setSelectedSeatIds(normalized.seatIds);
        setHoldState(normalized.holdState);
        setNow(Date.now());
        toast.success(
          ticketingMode === "paid"
            ? "Hold-ul a fost extins. Continua imediat spre plata."
            : "Hold-ul a fost extins. Continua imediat spre confirmarea biletelor.",
        );
        router.push(`/meciuri/${matchSlug}/checkout?hold=${normalized.holdState?.holdToken ?? holdState.holdToken}`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unele locuri nu mai sunt disponibile. Te rugam sa actualizezi selectia.",
        );
        router.refresh();
      }
    });
  }

  function resetSelection() {
    if (!selectedSeatIds.length) {
      return;
    }

    startTransition(async () => {
      for (const seatId of selectedSeatIds) {
        try {
          await callHoldEndpoint("/api/holds/release", {
            matchId,
            seatId,
            holdToken: holdState?.holdToken ?? null,
          });
        } catch {
          // incercam sa eliberam cat mai multe locuri; refresh-ul final va sincroniza realitatea
        }
      }

      setSelectedSeatIds([]);
      setHoldState(null);
      setNow(Date.now());
      toast.success("Selectia a fost resetata si locurile au fost eliberate.");
      router.refresh();
    });
  }

  const canContinue =
    selectedSeatIds.length > 0 &&
    Boolean(holdState?.holdToken) &&
    !isPending &&
    !isTicketingDisabled;

  return (
    <div className="grid gap-6 pb-24 xl:grid-cols-[1.2fr_0.8fr] xl:pb-0">
      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardHeader className="gap-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
            Harta locatiei si a locurilor
          </CardTitle>
          <p className="max-w-3xl text-sm leading-6 text-neutral-600">
            La fiecare click pe un loc disponibil, backend-ul incearca imediat sa il blocheze
            temporar pentru tine. Dupa confirmarea selectiei, hold-ul se extinde pentru checkout
            sau emitere, iar locul devine indisponibil pentru ceilalti utilizatori.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6">
          <StadiumMap
            stadiumId={stadiumId}
            stadiumName={stadiumName}
            overrideConfig={stadiumMapConfig}
            sectors={sectors}
            selectedSeatIds={selectedSeatIds}
            pendingSeatIds={pendingSeatIds}
            disabled={isPending || isTicketingDisabled}
            onSeatToggle={toggleSeat}
          />
        </CardContent>
      </Card>

      <Card className="surface-dark self-start overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.24),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white xl:sticky xl:top-24">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardHeader className="gap-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em]">
            {ticketingMode === "paid" && !viewer.isPrivileged ? "Procura bilete" : "Emitere bilete"}
          </CardTitle>
          <p className="text-sm leading-6 text-white/72">{matchTitle}</p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
            {isSuperadmin
              ? "Superadmin: poti emite fara limita standard."
              : remainingLimit === null
                ? "Rol privilegiat: se aplica limitarile standard ale evenimentului."
                : `Limita ta ramasa pentru acest eveniment: ${remainingLimit} bilete.`}
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
            1. Apasa pe locurile disponibile pentru hold instant.
            <br />
            2. Deselecteaza orice loc pe care nu il mai doresti.
            <br />
            3. Continua pentru extinderea hold-ului si finalizare.
          </div>

          {!viewer.isAuthenticated && holdConfig.allowGuestHold && !holdConfig.requireLoginBeforeHold ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
              Poti bloca temporar locurile si ca vizitator, pe baza sesiunii curente. Inainte de
              emiterea finala sau checkout, vei fi rugat sa intri in cont.
            </div>
          ) : null}

          {ticketingMode === "paid" ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/85">
              Pretul de baza este{" "}
              <span className="font-semibold">
                {formatCurrencyFromCents(ticketPriceCents, currency)}
              </span>
              . Unele sectoare pot avea override de pret, iar totalul final se calculeaza automat
              dupa locurile alese.
            </div>
          ) : null}

          {viewer.reservationBlockedUntil ? (
            <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-6 text-white/80">
              Contul are restrictii pana la{" "}
              {formatDateTimeInTimeZone(viewer.reservationBlockedUntil, {
                locale: "ro-RO",
                includeSeconds: true,
              })}.
            </div>
          ) : null}

          <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#fecaca]">Locuri selectate</p>
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
                      ? formatCurrencyFromCents(seat.ticketPriceCents, seat.currency)
                      : "Acces gratuit"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-white/65">
                Nu ai selectat inca niciun loc. Incepe din harta locatiei, iar blocarea temporara
                se face imediat dupa confirmarea backend-ului.
              </p>
            )}
          </div>

          {selectedSeats.length && ticketingMode === "paid" ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              Total estimat:{" "}
              <span className="font-semibold text-white">
                {formatCurrencyFromCents(estimatedTotal, currency)}
              </span>
            </div>
          ) : null}

          {holdState ? (
            <div className="rounded-[26px] border border-white/10 bg-white/8 p-4 text-sm text-white">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#fca5a5]" />
                {holdState.holdType === "initial"
                  ? `Hold initial activ. Expira in aproximativ ${countdown ?? "--:--"}.`
                  : `Hold extins activ. Expira in aproximativ ${countdown ?? "--:--"}.`}
              </div>
              <p className="mt-2 text-xs leading-5 text-white/70">
                Durata curenta configurata pentru acest pas este de aproximativ{" "}
                {Math.round(holdDurationLabelSeconds / 60)} minute.
              </p>
            </div>
          ) : null}

          {!viewer.isAuthenticated && requiresLoginBeforeHold ? (
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
                onClick={continueWithSelection}
                disabled={!canContinue}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                {isPending ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : viewer.isPrivileged ? (
                  <UserRoundCog className="mr-2 h-4 w-4" />
                ) : isPaidFlow ? (
                  <ShoppingCart className="mr-2 h-4 w-4" />
                ) : (
                  <TicketPlus className="mr-2 h-4 w-4" />
                )}
                {isPaidFlow ? "Continua la plata" : "Confirma selectia"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetSelection}
                disabled={isPending || selectedSeatIds.length === 0}
                className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Elibereaza selectia
              </Button>
              {!selectedSeatIds.length ? (
                <p className="text-xs leading-5 text-white/60">
                  Apasa pe locurile disponibile; blocarea se face imediat si sigur in backend.
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="fixed inset-x-4 bottom-4 z-40 xl:hidden">
        <div className="rounded-[24px] border border-black/10 bg-white/95 p-3 shadow-[0_18px_50px_-24px_rgba(17,17,17,0.4)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Selectie curenta
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111111]">
                {selectedSeats.length} {selectedSeats.length === 1 ? "loc selectat" : "locuri selectate"}
              </p>
            </div>
            {requiresLoginBeforeHold && !viewer.isAuthenticated ? (
              <Button
                asChild
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                <Link href={`/autentificare?next=/meciuri/${matchSlug}/rezerva`}>
                  Continua
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={continueWithSelection}
                disabled={!canContinue}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                {isPaidFlow ? "Continua" : "Confirma"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
