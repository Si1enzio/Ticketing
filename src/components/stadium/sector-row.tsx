"use client";

import { useI18n } from "@/components/i18n-provider";
import { SeatButton } from "@/components/stadium/seat-button";
import type { StadiumSeatRow } from "@/lib/stadium/stadium-types";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";

export function SectorRow({
  row,
  disabled,
  onSeatClick,
  pendingSeatIds = [],
  scrollContainerRef,
  onScroll,
  canBulkSelect = false,
  onSelectAvailableSeats,
}: {
  row: StadiumSeatRow;
  disabled?: boolean;
  onSeatClick: (seatId: string) => void;
  pendingSeatIds?: string[];
  scrollContainerRef?: (node: HTMLDivElement | null) => void;
  onScroll?: (scrollLeft: number) => void;
  canBulkSelect?: boolean;
  onSelectAvailableSeats?: (seatIds: string[]) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);
  const availableSeatIds = row.cells.reduce<string[]>((acc, cell) => {
    if (cell.kind === "seat" && cell.status === "available") {
      acc.push(cell.seat.seatId);
    }

    return acc;
  }, []);
  const canBulkSelectRow =
    canBulkSelect && !disabled && availableSeatIds.length > 0 && Boolean(onSelectAvailableSeats);

  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-3">
      {canBulkSelectRow ? (
        <button
          type="button"
          title={copy.selectAvailableRow}
          onClick={() => onSelectAvailableSeats?.(availableSeatIds)}
          className="w-16 rounded-full bg-[#111111] px-3 py-2 text-center text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b91c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]/35"
        >
          {copy.row} {row.label}
        </button>
      ) : (
        <div className="w-16 rounded-full bg-[#111111] px-3 py-2 text-center text-xs font-semibold text-white">
          {copy.row} {row.label}
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-2"
        onScroll={(event) => onScroll?.(event.currentTarget.scrollLeft)}
      >
        <div className="grid min-w-max grid-flow-col auto-cols-[2.75rem] gap-2 sm:auto-cols-[3rem]">
          {row.cells.map((cell) => {
            if (cell.kind !== "seat") {
              return (
                <div
                  key={cell.key}
                  className="h-11 w-11 rounded-2xl border border-dashed border-black/6 bg-transparent sm:h-12 sm:w-12"
                  aria-hidden="true"
                />
              );
            }

            return (
              <SeatButton
                key={cell.key}
                label={cell.seat.seatNumber}
                status={cell.status}
                pending={pendingSeatIds.includes(cell.seat.seatId)}
                disabled={disabled || (cell.status !== "available" && cell.status !== "selected")}
                onClick={() => onSeatClick(cell.seat.seatId)}
                title={`${copy.row} ${cell.seat.rowLabel} - ${copy.seat} ${cell.seat.seatNumber}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
