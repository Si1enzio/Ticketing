"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import type { StadiumSeat } from "@/lib/domain/types";
import { toggleSeatFlagAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export function SeatFlagEditor({
  seats,
  sectorName,
}: {
  seats: StadiumSeat[];
  sectorName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [rowFilter, setRowFilter] = useState<string>("all");

  const rowOptions = useMemo(
    () =>
      Array.from(new Set(seats.map((seat) => seat.rowLabel))).sort(
        (left, right) => Number(left) - Number(right),
      ),
    [seats],
  );

  const visibleSeats = useMemo(() => {
    if (rowFilter === "all") {
      return seats;
    }

    return seats.filter((seat) => seat.rowLabel === rowFilter);
  }, [rowFilter, seats]);

  function toggleFlag(
    seatId: string,
    flag: "is_disabled" | "is_obstructed" | "is_internal_only",
    value: boolean,
  ) {
    startTransition(async () => {
      await toggleSeatFlagAction({
        seatId,
        flag,
        value,
      });
      toast.success("Loc actualizat.");
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111111]">{sectorName}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            D = dezactivat, O = obstructie, I = intern
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="Toate randurile"
            active={rowFilter === "all"}
            onClick={() => setRowFilter("all")}
          />
          {rowOptions.map((rowLabel) => (
            <FilterChip
              key={rowLabel}
              label={`Rand ${rowLabel}`}
              active={rowFilter === rowLabel}
              onClick={() => setRowFilter(rowLabel)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {visibleSeats.map((seat) => (
          <div
            key={seat.id}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[22px] border border-black/6 bg-white px-4 py-3 shadow-[0_16px_40px_-36px_rgba(23,23,23,0.3)]"
          >
            <div>
              <p className="font-medium text-[#111111]">
                Rand {seat.rowLabel} - Loc {seat.seatNumber}
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                {seat.seatLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FlagButton
                label="D"
                title="Dezactiveaza locul"
                active={seat.isDisabled}
                pending={isPending}
                onClick={() => toggleFlag(seat.id, "is_disabled", !seat.isDisabled)}
              />
              <FlagButton
                label="O"
                title="Marcheaza obstructie"
                active={seat.isObstructed}
                pending={isPending}
                onClick={() =>
                  toggleFlag(seat.id, "is_obstructed", !seat.isObstructed)
                }
              />
              <FlagButton
                label="I"
                title="Marcheaza intern"
                active={seat.isInternalOnly}
                pending={isPending}
                onClick={() =>
                  toggleFlag(seat.id, "is_internal_only", !seat.isInternalOnly)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlagButton({
  label,
  title,
  active,
  pending,
  onClick,
}: {
  label: string;
  title: string;
  active: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition",
        active
          ? "border-[#dc2626] bg-[#dc2626] text-white"
          : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
      )}
    >
      {label}
    </button>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-black/8 bg-white text-neutral-600 hover:bg-neutral-50",
      )}
    >
      {label}
    </button>
  );
}
