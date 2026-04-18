"use client";

import { useMemo, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, ShieldAlert, ShieldCheck, TicketX, X } from "lucide-react";
import { toast } from "sonner";

import type { ScannerMatch, ScanResponse } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const resultStyles: Record<
  ScanResponse["result"],
  { title: string; className: string; icon: typeof ShieldCheck }
> = {
  valid: {
    title: "Acces valid",
    className: "border-emerald-300 bg-emerald-600 text-white",
    icon: ShieldCheck,
  },
  already_used: {
    title: "Bilet deja folosit",
    className: "border-red-300 bg-red-600 text-white",
    icon: ShieldAlert,
  },
  wrong_match: {
    title: "Meci gresit",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
  invalid_token: {
    title: "Token invalid",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
  canceled: {
    title: "Bilet anulat",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
  blocked: {
    title: "Bilet blocat",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
  not_found: {
    title: "Bilet inexistent",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
};

export function ScannerConsole({ matches }: { matches: ScannerMatch[] }) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [deviceLabel, setDeviceLabel] = useState("Telefon steward");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  async function submitToken(rawValue: string) {
    if (!selectedMatchId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/scanner/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: rawValue,
        matchId: selectedMatchId,
        deviceLabel,
      }),
    });

    const payload = (await response.json()) as ScanResponse;
    setLastResult(payload);
    setIsSubmitting(false);

    if (payload.result === "valid") {
      toast.success(payload.message);
      return;
    }

    toast.error(payload.message);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="surface-dark overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.24),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardHeader className="space-y-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em]">
            Scanner mobil
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="match">Meci activ</Label>
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger id="match" className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Selecteaza meciul" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deviceLabel">Dispozitiv / poarta</Label>
              <Input
                id="deviceLabel"
                value={deviceLabel}
                onChange={(event) => setDeviceLabel(event.target.value)}
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedMatch ? (
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/72">
              <p className="font-semibold text-white">{selectedMatch.title}</p>
              <p>{selectedMatch.opponentName}</p>
              <p className="mt-1">{new Date(selectedMatch.startsAt).toLocaleString("ro-RO")}</p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black">
            <Scanner
              onScan={(codes) => {
                const rawValue = codes[0]?.rawValue;
                if (rawValue) {
                  void submitToken(rawValue);
                }
              }}
              onError={(error) => {
                toast.error(String(error));
              }}
              formats={["qr_code"]}
              paused={isSubmitting || !selectedMatchId || Boolean(lastResult)}
              allowMultiple={false}
              scanDelay={400}
              constraints={{
                facingMode: "environment",
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setLastResult(null)}
            className="w-full rounded-full border-white/12 bg-white/5 text-white hover:bg-white/10"
          >
            <Camera className="mr-2 h-4 w-4" />
            Curata rezultatul
          </Button>
        </CardContent>
      </Card>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardHeader>
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
            Rezultat scanare
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastResult ? (
            <div className={`rounded-[26px] border p-5 ${resultStyles[lastResult.result].className}`}>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = resultStyles[lastResult.result].icon;
                  return <Icon className="h-6 w-6" />;
                })()}
                <div>
                  <p className="text-xs uppercase tracking-[0.24em]">
                    {resultStyles[lastResult.result].title}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{lastResult.message}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm">
                {lastResult.ticketCode ? <p>Cod: {lastResult.ticketCode}</p> : null}
                {lastResult.matchTitle ? <p>Meci: {lastResult.matchTitle}</p> : null}
                {lastResult.sectorLabel ? <p>Sector: {lastResult.sectorLabel}</p> : null}
                {lastResult.seatLabel ? <p>Loc: {lastResult.seatLabel}</p> : null}
                {lastResult.scannedAt ? (
                  <p>Ora: {new Date(lastResult.scannedAt).toLocaleString("ro-RO")}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-black/10 bg-neutral-50 p-8 text-sm leading-7 text-neutral-600">
              Selecteaza meciul, porneste camera si scaneaza QR-ul. Rezultatul apare
              instant, cu feedback mare si clar pentru fluxul rapid de la poarta.
            </div>
          )}
        </CardContent>
      </Card>

      {lastResult ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6 backdrop-blur-[2px]">
          <div
            className={`pointer-events-auto relative flex h-[78vh] w-[88vw] max-h-[46rem] max-w-2xl flex-col justify-center rounded-[32px] border-4 p-8 text-center shadow-[0_36px_120px_-48px_rgba(0,0,0,0.5)] sm:p-10 ${resultStyles[lastResult.result].className}`}
          >
            <button
              type="button"
              onClick={() => setLastResult(null)}
              className="absolute right-4 top-4 rounded-full border border-white/25 bg-white/12 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Inchide rezultatul</span>
            </button>

            <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center">
              {(() => {
                const Icon = resultStyles[lastResult.result].icon;
                return <Icon className="h-20 w-20 sm:h-24 sm:w-24" />;
              })()}
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.34em] text-white/85">
                {resultStyles[lastResult.result].title}
              </p>
              <p className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
                {lastResult.message}
              </p>

              <div className="mt-8 grid w-full gap-3 text-left text-sm sm:grid-cols-2 sm:text-base">
                {lastResult.ticketCode ? (
                  <ResultLine label="Cod bilet" value={lastResult.ticketCode} />
                ) : null}
                {lastResult.matchTitle ? (
                  <ResultLine label="Meci" value={lastResult.matchTitle} />
                ) : null}
                {lastResult.sectorLabel ? (
                  <ResultLine label="Sector" value={lastResult.sectorLabel} />
                ) : null}
                {lastResult.seatLabel ? <ResultLine label="Loc" value={lastResult.seatLabel} /> : null}
                {lastResult.scannedAt ? (
                  <ResultLine
                    label="Ora"
                    value={new Date(lastResult.scannedAt).toLocaleString("ro-RO")}
                  />
                ) : null}
              </div>

              <Button
                type="button"
                onClick={() => setLastResult(null)}
                className="mt-8 rounded-full border border-white/20 bg-white px-8 text-base font-semibold text-[#111111] hover:bg-white/90"
              >
                Continua scanarea
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/72">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-white sm:text-base">{value}</p>
    </div>
  );
}
