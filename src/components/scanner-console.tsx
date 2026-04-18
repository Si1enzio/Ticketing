"use client";

import { useMemo, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, ShieldAlert, ShieldCheck, TicketX } from "lucide-react";
import { toast } from "sonner";

import type { ScannerMatch, ScanResponse } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const resultStyles: Record<
  ScanResponse["result"],
  { title: string; className: string; icon: typeof ShieldCheck }
> = {
  valid: {
    title: "Acces valid",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: ShieldCheck,
  },
  already_used: {
    title: "Bilet deja folosit",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: ShieldAlert,
  },
  wrong_match: {
    title: "Meci greșit",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: TicketX,
  },
  invalid_token: {
    title: "Token invalid",
    className: "border-red-200 bg-red-50 text-red-900",
    icon: TicketX,
  },
  canceled: {
    title: "Bilet anulat",
    className: "border-red-200 bg-red-50 text-red-900",
    icon: TicketX,
  },
  blocked: {
    title: "Bilet blocat",
    className: "border-red-200 bg-red-50 text-red-900",
    icon: TicketX,
  },
  not_found: {
    title: "Bilet inexistent",
    className: "border-red-200 bg-red-50 text-red-900",
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
      <Card className="border-[#d5a021]/20 bg-[#08140f] text-white">
        <CardHeader className="space-y-4">
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em]">
            Scanner mobil
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="match">Meci activ</Label>
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger id="match" className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Selectează meciul" />
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
              <Label htmlFor="deviceLabel">Dispozitiv / poartă</Label>
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
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
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
              paused={isSubmitting || !selectedMatchId}
              allowMultiple={false}
              scanDelay={1000}
              constraints={{
                facingMode: "environment",
              }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setLastResult(null)}
            className="w-full rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Camera className="mr-2 h-4 w-4" />
            Curăță rezultatul
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#e7dfbf] bg-white/95">
        <CardHeader>
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
            Rezultat scanare
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastResult ? (
            <div className={`rounded-3xl border p-5 ${resultStyles[lastResult.result].className}`}>
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
                {lastResult.scannedAt ? <p>Ora: {new Date(lastResult.scannedAt).toLocaleString("ro-RO")}</p> : null}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#d5a021]/30 bg-[#fffdf6] p-8 text-sm leading-7 text-slate-600">
              Selectează meciul, pornește camera și scanează QR-ul. Rezultatul apare
              instant și este codificat color pentru utilizare rapidă la intrare.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

