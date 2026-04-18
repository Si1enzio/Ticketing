"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import type { StadiumSeat } from "@/lib/domain/types";
import { toggleSeatFlagAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export function SeatFlagEditor({ seats }: { seats: StadiumSeat[] }) {
  const [isPending, startTransition] = useTransition();

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
    <div className="grid gap-3">
      {seats.map((seat) => (
        <div
          key={seat.id}
          className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-[#efe6c7] bg-[#fffdf6] px-4 py-3"
        >
          <div>
            <p className="font-medium text-[#08140f]">
              Rând {seat.rowLabel} • Loc {seat.seatNumber}
            </p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {seat.seatLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FlagButton
              label="D"
              active={seat.isDisabled}
              pending={isPending}
              onClick={() => toggleFlag(seat.id, "is_disabled", !seat.isDisabled)}
            />
            <FlagButton
              label="O"
              active={seat.isObstructed}
              pending={isPending}
              onClick={() =>
                toggleFlag(seat.id, "is_obstructed", !seat.isObstructed)
              }
            />
            <FlagButton
              label="I"
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
  );
}

function FlagButton({
  label,
  active,
  pending,
  onClick,
}: {
  label: string;
  active: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition",
        active
          ? "border-[#11552d] bg-[#11552d] text-white"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}

