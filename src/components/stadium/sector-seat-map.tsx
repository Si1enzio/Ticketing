"use client";

import { useEffect, useMemo, useRef } from "react";

import { useI18n } from "@/components/i18n-provider";
import { SectorRow } from "@/components/stadium/sector-row";
import type { SeatMapSector } from "@/lib/domain/types";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";
import type { SectorConfig } from "@/lib/stadium/stadium-types";
import { buildSeatRows } from "@/lib/stadium/stadium-utils";

export function SectorSeatMap({
  sector,
  sectorConfig,
  selectedSeatIds,
  disabled,
  onSeatToggle,
}: {
  sector: SeatMapSector | null;
  sectorConfig?: SectorConfig | null;
  selectedSeatIds: string[];
  disabled?: boolean;
  onSeatToggle: (seatId: string, availability: string) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);
  const rowScrollRefs = useRef<Array<HTMLDivElement | null>>([]);
  const isSyncingScrollRef = useRef(false);

  const rows = useMemo(() => {
    if (!sector) {
      return [];
    }

    return buildSeatRows(sector, selectedSeatIds, sectorConfig?.rowConfigs);
  }, [sector, selectedSeatIds, sectorConfig]);

  const availableSeatsCount = useMemo(
    () => sector?.seats.filter((seat) => seat.availability === "available").length ?? 0,
    [sector],
  );

  useEffect(() => {
    rowScrollRefs.current = rowScrollRefs.current.slice(0, rows.length);
  }, [rows.length]);

  function syncRowScroll(scrollLeft: number) {
    if (isSyncingScrollRef.current) {
      return;
    }

    isSyncingScrollRef.current = true;

    rowScrollRefs.current.forEach((node) => {
      if (!node || Math.abs(node.scrollLeft - scrollLeft) < 1) {
        return;
      }

      node.scrollLeft = scrollLeft;
    });

    window.requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }

  if (!sector) {
    return (
      <div className="rounded-[28px] border border-dashed border-black/10 bg-neutral-50 p-6 text-sm text-neutral-500">
        {copy.noSectorSelected}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-black/10 bg-neutral-50 p-6 text-sm text-neutral-500">
        {copy.noSeatsAvailable}
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full ring-2 ring-white"
            style={{ backgroundColor: sector.color }}
          />
          <div>
            <p className="font-semibold text-[#111111]">{sector.name}</p>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              {sector.code}
            </p>
          </div>
        </div>
        <div className="rounded-full border border-black/6 bg-white px-4 py-2 text-right shadow-[0_12px_34px_-28px_rgba(17,17,17,0.45)]">
          <p className="text-sm font-semibold text-[#111111]">
            {availableSeatsCount} {copy.available}
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            / {sector.seats.length} {copy.seats}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-black/6 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            {copy.totalSeatsLabel}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#111111]">{sector.seats.length}</p>
        </div>
        <div className="rounded-[22px] border border-black/6 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            {copy.availableNowLabel}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#111111]">{availableSeatsCount}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {rows.map((row, rowIndex) => (
          <SectorRow
            key={row.id}
            row={row}
            disabled={disabled}
            scrollContainerRef={(node) => {
              rowScrollRefs.current[rowIndex] = node;
            }}
            onScroll={syncRowScroll}
            onSeatClick={(seatId) => {
              const seat = sector.seats.find((item) => item.seatId === seatId);
              if (!seat) {
                return;
              }

              onSeatToggle(seatId, seat.availability);
            }}
          />
        ))}
      </div>
    </div>
  );
}
