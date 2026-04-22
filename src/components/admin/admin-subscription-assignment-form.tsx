"use client";

import { useMemo, useState } from "react";

import type { StadiumBuilder, SubscriptionProduct } from "@/lib/domain/types";
import { assignUserSubscriptionAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminSubscriptionAssignmentForm({
  userId,
  products,
  stadiums,
}: {
  userId: string;
  products: SubscriptionProduct[];
  stadiums: StadiumBuilder[];
}) {
  const initialStadiumId = stadiums[0]?.id ?? "";
  const [stadiumId, setStadiumId] = useState(initialStadiumId);
  const [sectorId, setSectorId] = useState("");
  const [seatId, setSeatId] = useState("");

  const currentStadium = useMemo(
    () => stadiums.find((item) => item.id === stadiumId) ?? null,
    [stadiumId, stadiums],
  );

  const sectors = useMemo(() => currentStadium?.sectors ?? [], [currentStadium]);
  const currentSector = useMemo(
    () => sectors.find((item) => item.id === sectorId) ?? null,
    [sectorId, sectors],
  );
  const seats = useMemo(
    () =>
      (currentSector?.seats ?? []).filter(
        (seat) => !seat.isDisabled && !seat.isObstructed && !seat.isInternalOnly,
      ),
    [currentSector],
  );
  const localNow = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }, []);

  return (
    <form
      action={assignUserSubscriptionAction}
      className="grid gap-4 rounded-[24px] border border-black/6 bg-neutral-50 p-4"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="stadiumId" value={stadiumId} />
      <input type="hidden" name="seatId" value={seatId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="productId">Produs</Label>
          <select
            id="productId"
            name="productId"
            className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {(product.priceCents / 100).toFixed(2)} {product.currency}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="startsAt">Valabil din</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={localNow}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="stadium">Stadion</Label>
          <select
            id="stadium"
            value={stadiumId}
            onChange={(event) => {
              setStadiumId(event.target.value);
              setSectorId("");
              setSeatId("");
            }}
            className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
          >
            {stadiums.map((stadium) => (
              <option key={stadium.id} value={stadium.id}>
                {stadium.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sector">Sector</Label>
          <select
            id="sector"
            value={sectorId}
            onChange={(event) => {
              setSectorId(event.target.value);
              setSeatId("");
            }}
            className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
          >
            <option value="">Alege sectorul</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name} ({sector.code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="seat">Loc abonament</Label>
          <select
            id="seat"
            value={seatId}
            onChange={(event) => setSeatId(event.target.value)}
            className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
          >
            <option value="">Alege locul</option>
            {seats.map((seat) => (
              <option key={seat.id} value={seat.id}>
                Rand {seat.rowLabel} - loc {seat.seatNumber}
                {seat.seatLabel && seat.seatLabel !== String(seat.seatNumber)
                  ? ` (${seat.seatLabel})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="note">Nota</Label>
          <Input id="note" name="note" placeholder="Abonament emis de administratie" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stadiumId || !seatId}
        className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
      >
        Atribuie abonament
      </Button>
    </form>
  );
}
