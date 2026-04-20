"use client";

import { useI18n } from "@/components/i18n-provider";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";

export function StadiumLegend({
  mode,
}: {
  mode: "overview" | "seat-map";
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);

  const items =
    mode === "overview"
      ? [
          { label: copy.mapLegendAvailable, className: "bg-[#111111] text-white" },
          { label: copy.mapLegendLimited, className: "bg-[#fca5a5] text-[#7f1d1d]" },
          { label: copy.mapLegendUnavailable, className: "bg-[#fee2e2] text-[#b91c1c]" },
          { label: copy.mapLegendHidden, className: "bg-neutral-200 text-neutral-700" },
        ]
      : [
          { label: copy.seatLegendAvailable, className: "bg-[#111111] text-white" },
          { label: copy.seatLegendSelected, className: "bg-[#dc2626] text-white" },
          { label: copy.seatLegendHeld, className: "bg-neutral-200 text-neutral-700" },
          { label: copy.seatLegendSold, className: "bg-[#fca5a5] text-[#7f1d1d]" },
          { label: copy.seatLegendBlocked, className: "bg-[#fee2e2] text-[#b91c1c]" },
        ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`rounded-full px-3 py-1 text-xs font-medium ${item.className}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
