"use client";

import type { StadiumSeatStatus } from "@/lib/stadium/stadium-types";
import { cn } from "@/lib/utils";

const seatStatusClassNames: Record<StadiumSeatStatus, string> = {
  available:
    "border-black/10 bg-white text-[#111111] hover:-translate-y-0.5 hover:border-[#dc2626]/35 hover:text-[#b91c1c]",
  selected:
    "border-[#dc2626] bg-[#dc2626] text-white shadow-[0_16px_30px_-18px_rgba(220,38,38,0.85)]",
  held: "border-neutral-300 bg-neutral-200 text-neutral-600",
  reserved: "border-neutral-300 bg-neutral-200 text-neutral-600",
  sold: "border-neutral-300 bg-neutral-200 text-neutral-600",
  blocked: "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
  unavailable: "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
};

export function SeatButton({
  label,
  status,
  disabled,
  onClick,
  title,
}: {
  label: string | number;
  status: StadiumSeatStatus;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "aspect-square rounded-2xl border text-xs font-semibold transition",
        seatStatusClassNames[status],
        disabled && "cursor-not-allowed opacity-90",
      )}
    >
      {label}
    </button>
  );
}
