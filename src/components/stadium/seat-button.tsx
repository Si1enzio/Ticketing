"use client";

import type { StadiumSeatStatus } from "@/lib/stadium/stadium-types";
import { cn } from "@/lib/utils";

const seatStatusClassNames: Record<StadiumSeatStatus, string> = {
  available:
    "border-black/10 bg-white text-[#111111] hover:-translate-y-0.5 hover:border-[#dc2626]/35 hover:text-[#b91c1c]",
  selected:
    "border-[#dc2626] bg-[#dc2626] text-white shadow-[0_16px_30px_-18px_rgba(220,38,38,0.85)]",
  held: "border-neutral-300 bg-neutral-200 text-neutral-600",
  reserved:
    "border-[#fca5a5] bg-[#fca5a5] text-[#7f1d1d] shadow-[0_16px_30px_-20px_rgba(252,165,165,0.65)]",
  sold:
    "border-[#fca5a5] bg-[#fca5a5] text-[#7f1d1d] shadow-[0_16px_30px_-20px_rgba(252,165,165,0.65)]",
  blocked: "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
  unavailable: "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
};

export function SeatButton({
  label,
  status,
  disabled,
  pending,
  onClick,
  title,
}: {
  label: string | number;
  status: StadiumSeatStatus;
  disabled?: boolean;
  pending?: boolean;
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
        "flex min-h-11 min-w-11 items-center justify-center rounded-2xl border text-sm font-semibold transition sm:min-h-12 sm:min-w-12",
        seatStatusClassNames[status],
        disabled && "cursor-not-allowed opacity-90",
        pending && "animate-pulse ring-2 ring-[#dc2626]/25",
      )}
    >
      {pending ? "..." : label}
    </button>
  );
}
