"use client";

import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import Link from "next/link";
import { Scanner, setZXingModuleOverrides } from "@yudiel/react-qr-scanner";
import { ArrowLeft, Camera, ShieldAlert, ShieldCheck, TicketX, X } from "lucide-react";

import type { ScanResponse, ScannerMatch } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEVICE_LABEL_STORAGE_KEY = "milsami-scanner-device-label";
const LOCAL_ZXING_READER_WASM_PATH = "/vendor/zxing/zxing_reader.wasm";

let isZxingWasmConfigured = false;

function configureLocalZxingWasm() {
  if (isZxingWasmConfigured || typeof window === "undefined") {
    return;
  }

  setZXingModuleOverrides({
    locateFile(fileName, prefix) {
      if (fileName === "zxing_reader.wasm" || fileName.endsWith("/zxing_reader.wasm")) {
        return LOCAL_ZXING_READER_WASM_PATH;
      }

      return `${prefix}${fileName}`;
    },
  });

  isZxingWasmConfigured = true;
}

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
    title: "Acces deja folosit",
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
    title: "Credential anulat",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
  blocked: {
    title: "Credential blocat",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
  not_found: {
    title: "Credential inexistent",
    className: "border-red-300 bg-red-600 text-white",
    icon: TicketX,
  },
};

function getScannerErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isPassiveScannerError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("notfound") ||
    normalized.includes("no qr") ||
    normalized.includes("no barcode") ||
    normalized.includes("not found") ||
    normalized.includes("could not detect")
  );
}

export function ScannerConsole({
  match,
  backHref = "/scanner",
}: {
  match: ScannerMatch;
  backHref?: string;
}) {
  const [deviceLabel, setDeviceLabel] = useState(() => {
    if (typeof window === "undefined") {
      return "Telefon steward";
    }

    return window.localStorage.getItem(DEVICE_LABEL_STORAGE_KEY) ?? "Telefon steward";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [overlayResult, setOverlayResult] = useState<ScanResponse | null>(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [scannerErrorMessage, setScannerErrorMessage] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const lastSubmittedRef = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    configureLocalZxingWasm();
    window.localStorage.setItem(DEVICE_LABEL_STORAGE_KEY, deviceLabel);
  }, [deviceLabel]);

  useEffect(() => {
    if (!overlayResult) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setOverlayResult(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [overlayResult]);

  const matchDateLabel = useMemo(
    () => new Date(match.startsAt).toLocaleString("ro-RO"),
    [match.startsAt],
  );

  async function submitToken(rawValue: string) {
    const normalizedRawValue = rawValue.trim();

    if (!normalizedRawValue) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    const now = Date.now();
    const lastSubmitted = lastSubmittedRef.current;

    if (
      lastSubmitted?.value === normalizedRawValue &&
      now - lastSubmitted.at < 2500
    ) {
      return;
    }

    lastSubmittedRef.current = { value: normalizedRawValue, at: now };
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: normalizedRawValue,
          matchId: match.id,
          deviceLabel,
        }),
      });

      const payload = (await response.json()) as ScanResponse;
      setLastResult(payload);
      setOverlayResult(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="surface-dark overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.24),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-4xl uppercase tracking-[0.08em]">
                Scanner mobil
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-white/68">
                Scanner fix pentru meciul selectat. La refresh ramai pe acelasi meci.
              </p>
            </div>
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Inapoi la lista meciurilor
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/72">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                Meci selectat
              </p>
              <p className="mt-2 font-semibold text-white">{match.title}</p>
              <p className="mt-1">{match.competitionName}</p>
              <p className="mt-1">{match.stadiumName}</p>
              <p className="mt-1">{matchDateLabel}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deviceLabel">Dispozitiv / poarta</Label>
              <Input
                id="deviceLabel"
                value={deviceLabel}
                onChange={(event) => setDeviceLabel(event.target.value)}
                className="border-white/10 bg-white/5 text-white"
              />
              <p className="text-xs leading-5 text-white/52">
                Eticheta este pastrata local pe dispozitiv si ramane dupa refresh.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black">
            <Scanner
              key={scannerKey}
              onScan={(codes) => {
                const rawValue = codes[0]?.rawValue;
                if (rawValue) {
                  setScannerErrorMessage(null);
                  void submitToken(rawValue);
                }
              }}
              onError={(error) => {
                const message = getScannerErrorMessage(error);

                if (isPassiveScannerError(message)) {
                  return;
                }

                setScannerErrorMessage(message);
              }}
              formats={["qr_code"]}
              paused={isSubmitting || Boolean(overlayResult)}
              allowMultiple={false}
              scanDelay={400}
              components={{
                finder: true,
                torch: true,
                zoom: true,
              }}
              sound
              constraints={{
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
            />
          </div>

          {scannerErrorMessage ? (
            <div className="rounded-[24px] border border-red-300/40 bg-red-500/12 p-4 text-sm leading-6 text-red-50">
              <p className="font-semibold">Camera nu a pornit stabil.</p>
              <p className="mt-1 text-white/72">{scannerErrorMessage}</p>
              <Button
                type="button"
                onClick={() => {
                  setScannerErrorMessage(null);
                  setScannerKey((value) => value + 1);
                }}
                className="mt-3 rounded-full bg-white text-[#111111] hover:bg-white/90"
              >
                Reporneste camera
              </Button>
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLastResult(null);
              setOverlayResult(null);
              setScannerErrorMessage(null);
            }}
            className="w-full rounded-full border-white/12 bg-white/5 text-white hover:bg-white/10"
          >
            <Camera className="mr-2 h-4 w-4" />
            Curata rezultatul
          </Button>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitToken(manualToken);
              setManualToken("");
            }}
            className="rounded-[26px] border border-white/10 bg-white/5 p-4"
          >
            <Label htmlFor="manual-token" className="text-white">
              Backup: token QR copiat
            </Label>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Daca telefonul nu decodeaza camera, poti scana QR-ul cu o aplicatie externa
              si lipi aici textul obtinut.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                id="manual-token"
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                placeholder="Lipeste tokenul QR"
                className="border-white/10 bg-black/20 text-white placeholder:text-white/30"
              />
              <Button
                type="submit"
                disabled={!manualToken.trim() || isSubmitting}
                className="rounded-full bg-white text-[#111111] hover:bg-white/90"
              >
                Valideaza
              </Button>
            </div>
          </form>
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
                {lastResult.ticketCode ? (
                  <p>
                    {lastResult.credentialKind === "subscription"
                      ? "Cod abonament"
                      : "Cod bilet"}
                    : {` ${lastResult.ticketCode}`}
                  </p>
                ) : null}
                {lastResult.matchTitle ? <p>Meci: {lastResult.matchTitle}</p> : null}
                {lastResult.sectorLabel ? <p>Sector: {lastResult.sectorLabel}</p> : null}
                {lastResult.seatLabel ? <p>Loc: {lastResult.seatLabel}</p> : null}
                {lastResult.holderName ? <p>Titular: {lastResult.holderName}</p> : null}
                {lastResult.holderBirthDate ? (
                  <p>
                    Data nasterii:{" "}
                    {new Date(lastResult.holderBirthDate).toLocaleDateString("ro-RO")}
                  </p>
                ) : null}
                {lastResult.scannedAt ? (
                  <p>Ora: {new Date(lastResult.scannedAt).toLocaleString("ro-RO")}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-black/10 bg-neutral-50 p-8 text-sm leading-7 text-neutral-600">
              Porneste camera si scaneaza QR-ul pentru meciul selectat. Rezultatul ramane
              afisat mai jos chiar si dupa inchiderea overlay-ului temporar.
            </div>
          )}
        </CardContent>
      </Card>

      {overlayResult ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-8 sm:px-6 sm:py-10 backdrop-blur-[2px]">
          <div
            className={`pointer-events-auto relative flex w-[min(70vw,30rem)] min-w-[18rem] max-w-[30rem] max-h-[calc(100vh-4rem)] flex-col overflow-y-auto rounded-[32px] border-4 px-5 py-7 text-center shadow-[0_36px_120px_-48px_rgba(0,0,0,0.5)] sm:max-h-[calc(100vh-5rem)] sm:px-7 sm:py-9 ${resultStyles[overlayResult.result].className} max-sm:w-[min(86vw,24rem)]`}
          >
            <button
              type="button"
              onClick={() => setOverlayResult(null)}
              className="absolute right-4 top-4 rounded-full border border-white/25 bg-white/12 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Inchide rezultatul</span>
            </button>

            <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-start py-2">
              {(() => {
                const Icon = resultStyles[overlayResult.result].icon;
                return <Icon className="h-14 w-14 sm:h-20 sm:w-20" />;
              })()}
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.34em] text-white/85 sm:text-sm">
                {resultStyles[overlayResult.result].title}
              </p>
              <p className="mt-4 text-2xl font-semibold leading-tight sm:text-4xl">
                {overlayResult.message}
              </p>

              <Button
                type="button"
                onClick={() => setOverlayResult(null)}
                className="mt-7 mb-1 rounded-full border border-white/20 bg-white px-8 text-base font-semibold text-[#111111] hover:bg-white/90"
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
