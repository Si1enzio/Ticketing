"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import type { StadiumRenderableSector } from "@/lib/stadium/stadium-types";
import { getSectorLabel } from "@/lib/stadium/stadium-utils";
import { getSectorLabelPosition, getSectorPath } from "@/lib/stadium/stadium-geometry";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function StadiumSector({
  sector,
  state,
  isSelected,
  onClick,
  onPointerDown,
}: {
  sector: StadiumRenderableSector;
  state: "available" | "limited" | "unavailable";
  isSelected?: boolean;
  onClick?: () => void;
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
}) {
  const { locale } = useI18n();
  const label = getSectorLabel(locale, sector.config);
  const path = getSectorPath(sector.config.shape);
  const labelPosition = getSectorLabelPosition(sector.config.shape);

  const fillClassName = cn(
    state === "available" && "fill-[#111111]/92",
    state === "limited" && "fill-[#fca5a5]/92",
    state === "unavailable" && "fill-[#fee2e2]",
  );

  const textClassName = cn(
    "pointer-events-none select-none font-semibold uppercase tracking-[0.22em]",
    state === "available" && "fill-white",
    state === "limited" && "fill-[#7f1d1d]",
    state === "unavailable" && "fill-[#b91c1c]",
  );

  return (
    <g
      role="button"
      tabIndex={0}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={cn("cursor-pointer transition-all", isSelected && "drop-shadow-[0_0_18px_rgba(220,38,38,0.35)]")}
    >
      <path
        d={path}
        className={cn(
          "stroke-white/90 stroke-[3] transition-all hover:opacity-95",
          fillClassName,
          isSelected && "stroke-[#dc2626] stroke-[5]",
        )}
      />
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className={textClassName}
        style={{ fontSize: 16 }}
      >
        {sector.config.code}
      </text>
      <text
        x={labelPosition.x}
        y={labelPosition.y + 20}
        textAnchor="middle"
        dominantBaseline="middle"
        className={textClassName}
        style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.84 }}
      >
        {label}
      </text>
    </g>
  );
}
