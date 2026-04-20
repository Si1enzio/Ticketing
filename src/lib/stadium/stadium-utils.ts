import type { AppLocale } from "@/lib/i18n/config";
import type { SeatMapSeat, SeatMapSector } from "@/lib/domain/types";
import { getLocalizedLabel } from "@/lib/stadium/stadium-localization";
import type {
  RowConfig,
  SectorConfig,
  StadiumMapConfig,
  StadiumRenderableSector,
  StadiumSeatLayoutCell,
  StadiumSeatRow,
  StadiumSeatStatus,
  StadiumSectorSummary,
  TribuneConfig,
} from "@/lib/stadium/stadium-types";

export function normalizeStadiumMapKey(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSeatStatus(
  seat: SeatMapSeat,
  selectedSeatIds: string[],
): StadiumSeatStatus {
  if (selectedSeatIds.includes(seat.seatId)) {
    return "selected";
  }

  switch (seat.availability) {
    case "available":
      return "available";
    case "held":
      return "held";
    case "reserved":
      return "sold";
    case "selected":
      return "selected";
    case "blocked":
    case "disabled":
    case "obstructed":
    case "internal":
      return "blocked";
    default:
      return "unavailable";
  }
}

export function getSectorSummary(
  sector: SeatMapSector,
  selectedSeatIds: string[],
): StadiumSectorSummary {
  const initial = {
    availableSeats: 0,
    heldSeats: 0,
    reservedSeats: 0,
    blockedSeats: 0,
    selectedSeats: 0,
  };

  const counts = sector.seats.reduce((acc, seat) => {
    const status = getSeatStatus(seat, selectedSeatIds);

    if (status === "available") acc.availableSeats += 1;
    if (status === "held") acc.heldSeats += 1;
    if (status === "selected") acc.selectedSeats += 1;
    if (status === "sold" || status === "reserved") acc.reservedSeats += 1;
    if (status === "blocked" || status === "unavailable") acc.blockedSeats += 1;

    return acc;
  }, initial);

  return {
    sectorId: sector.sectorId,
    code: sector.code,
    name: sector.name,
    color: sector.color,
    totalSeats: sector.seats.length,
    ...counts,
  };
}

export function getSectorAvailabilityState(summary: StadiumSectorSummary | null) {
  if (!summary) {
    return "unavailable" as const;
  }

  if (summary.availableSeats > 0 || summary.selectedSeats > 0) {
    return "available" as const;
  }

  if (summary.heldSeats > 0 || summary.reservedSeats > 0) {
    return "limited" as const;
  }

  return "unavailable" as const;
}

function getSectorCodeGroup(sector: SeatMapSector) {
  const codeMatch = sector.code.match(/^[A-Za-z]+/);
  if (codeMatch?.[0]) {
    return codeMatch[0].toUpperCase();
  }

  if (/vest/i.test(sector.name)) return "WEST";
  if (/est/i.test(sector.name)) return "EAST";
  if (/nord/i.test(sector.name)) return "NORTH";
  if (/sud/i.test(sector.name)) return "SOUTH";

  return "GENERAL";
}

function getFallbackTribuneLabel(group: string) {
  switch (group) {
    case "V":
    case "W":
    case "WEST":
      return "Tribuna Vest";
    case "E":
    case "EAST":
      return "Tribuna Est";
    case "N":
    case "NORTH":
      return "Peluza Nord";
    case "S":
    case "SOUTH":
      return "Peluza Sud";
    default:
      return "Sectiune generica";
  }
}

function getFallbackTribuneColor(group: string) {
  switch (group) {
    case "V":
    case "W":
    case "WEST":
      return "#dc2626";
    case "E":
    case "EAST":
      return "#111111";
    case "N":
    case "NORTH":
      return "#4b5563";
    case "S":
    case "SOUTH":
      return "#6b7280";
    default:
      return "#9ca3af";
  }
}

export function createFallbackStadiumMapConfig({
  mapKey,
  stadiumName,
  sectors,
}: {
  mapKey: string;
  stadiumName: string;
  sectors: SeatMapSector[];
}): StadiumMapConfig {
  const grouped = sectors.reduce<Record<string, SeatMapSector[]>>((acc, sector) => {
    const group = getSectorCodeGroup(sector);
    acc[group] = acc[group] ? [...acc[group], sector] : [sector];
    return acc;
  }, {});

  const tribunes: TribuneConfig[] = [];
  const sectorConfigs: SectorConfig[] = [];

  const columnLayout = [
    { x: 100, y: 180, width: 180, gap: 24 },
    { x: 720, y: 180, width: 180, gap: 24 },
    { x: 360, y: 90, width: 280, gap: 24 },
    { x: 360, y: 500, width: 280, gap: 24 },
  ];

  Object.entries(grouped).forEach(([group, items], groupIndex) => {
    const layout = columnLayout[groupIndex % columnLayout.length];
    const tribuneId = normalizeStadiumMapKey(group);

    tribunes.push({
      id: tribuneId,
      defaultLabel: getFallbackTribuneLabel(group),
      color: getFallbackTribuneColor(group),
      sectorCodes: items.map((sector) => sector.code),
      sortOrder: groupIndex,
    });

    items.forEach((sector, sectorIndex) => {
      const isVertical = layout.width < 220;
      const height = isVertical ? 120 : 90;
      const width = isVertical ? layout.width : layout.width - 20;
      const x = layout.x;
      const y = layout.y + sectorIndex * (height + layout.gap);

      sectorConfigs.push({
        id: `${tribuneId}-${normalizeStadiumMapKey(sector.code)}`,
        code: sector.code,
        defaultLabel: sector.name,
        tribuneId,
        isVisible: true,
        isBookable: true,
        shape: {
          type: "rectangle",
          x,
          y,
          width,
          height,
          rx: 18,
        },
      });
    });
  });

  return {
    mapKey,
    defaultLabel: stadiumName,
    viewBox: {
      minX: 0,
      minY: 0,
      width: 1000,
      height: 700,
    },
    tribunes,
    sectors: sectorConfigs,
    decorations: [
      {
        id: "fallback-pitch",
        kind: "rect",
        x: 320,
        y: 210,
        width: 360,
        height: 280,
        rx: 28,
        fill: "rgba(22,163,74,0.08)",
      },
    ],
  };
}

export function buildRenderableSectors(
  config: StadiumMapConfig,
  sectors: SeatMapSector[],
  selectedSeatIds: string[],
) {
  const dataByCode = new Map(sectors.map((sector) => [sector.code, sector]));

  return config.sectors
    .filter((sector) => sector.isVisible !== false && sector.isHiddenFromOverview !== true)
    .map<StadiumRenderableSector>((sectorConfig) => {
      const data = dataByCode.get(sectorConfig.code) ?? null;
      const summary = data ? getSectorSummary(data, selectedSeatIds) : null;

      return {
        config: sectorConfig,
        data,
        summary,
      };
    });
}

export function getVisibleTribunes(config: StadiumMapConfig) {
  return [...config.tribunes]
    .filter((tribune) => tribune.isVisible !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
}

export function getTribuneLabel(locale: AppLocale, tribune: TribuneConfig) {
  return getLocalizedLabel(locale, tribune.defaultLabel, tribune.labels);
}

export function getSectorLabel(locale: AppLocale, sector: SectorConfig) {
  return getLocalizedLabel(locale, sector.defaultLabel, sector.labels);
}

export function buildSeatRows(
  sector: SeatMapSector,
  selectedSeatIds: string[],
  rowConfigs?: RowConfig[],
): StadiumSeatRow[] {
  const rows = sector.seats.reduce<Record<string, SeatMapSeat[]>>((acc, seat) => {
    acc[seat.rowLabel] = acc[seat.rowLabel] ? [...acc[seat.rowLabel], seat] : [seat];
    return acc;
  }, {});

  const rowOrder = Object.keys(rows).sort((left, right) => Number(left) - Number(right));

  return rowOrder.map((rowLabel, index) => {
    const rowSeats = [...rows[rowLabel]].sort((left, right) => left.seatNumber - right.seatNumber);
    const layout = rowConfigs?.find((item) => item.label === rowLabel);

    if (layout) {
      const seatsByNumber = new Map(rowSeats.map((seat) => [seat.seatNumber, seat]));
      const cells = layout.seats
        .filter((seat) => seat.isVisible !== false)
        .map<StadiumSeatLayoutCell>((seatConfig) => {
          if (seatConfig.kind !== "seat" || !seatConfig.number) {
            const fallbackKind =
              seatConfig.kind === "aisle" || seatConfig.kind === "stair"
                ? seatConfig.kind
                : "gap";

            return {
              key: `${layout.id}-${seatConfig.key}`,
              kind: fallbackKind,
              label: seatConfig.label,
            };
          }

          const seat = seatsByNumber.get(seatConfig.number);

          if (!seat) {
            return {
              key: `${layout.id}-${seatConfig.key}`,
              kind: "gap",
              label: seatConfig.label,
            };
          }

          return {
            key: seat.seatId,
            kind: "seat",
            seat,
            isSelected: selectedSeatIds.includes(seat.seatId),
            status: getSeatStatus(seat, selectedSeatIds),
          };
        });

      return {
        id: layout.id,
        label: layout.label,
        cells,
      };
    }

    const maxSeat = Math.max(...rowSeats.map((seat) => seat.seatNumber));
    const cells: StadiumSeatLayoutCell[] = [];

    for (let seatNumber = 1; seatNumber <= maxSeat; seatNumber += 1) {
      const seat = rowSeats.find((item) => item.seatNumber === seatNumber);

      if (!seat) {
        cells.push({
          key: `${rowLabel}-gap-${seatNumber}`,
          kind: "gap",
        });
        continue;
      }

      cells.push({
        key: seat.seatId,
        kind: "seat",
        seat,
        isSelected: selectedSeatIds.includes(seat.seatId),
        status: getSeatStatus(seat, selectedSeatIds),
      });
    }

    return {
      id: `${sector.sectorId}-row-${index + 1}`,
      label: rowLabel,
      cells,
    };
  });
}
