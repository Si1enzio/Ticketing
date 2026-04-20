"use client";

import { useMemo } from "react";

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

  const rows = useMemo(() => {
    if (!sector) {
      return [];
    }

    return buildSeatRows(sector, selectedSeatIds, sectorConfig?.rowConfigs);
  }, [sector, selectedSeatIds, sectorConfig]);

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
        <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
          {sector.seats.length} {copy.seats}
        </p>
      </div>

      <div className="grid gap-3">
        {rows.map((row) => (
          <SectorRow
            key={row.id}
            row={row}
            disabled={disabled}
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
