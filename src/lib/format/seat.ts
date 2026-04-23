type SeatPositionInput = {
  rowLabel?: string | number | null;
  seatNumber?: string | number | null;
  seatLabel?: string | null;
};

type SectorSeatPositionInput = SeatPositionInput & {
  sectorName?: string | null;
};

export function formatSeatPosition(input: SeatPositionInput) {
  const rowLabel = normalizeSeatValue(input.rowLabel);
  const seatNumber = normalizeSeatValue(input.seatNumber);

  if (rowLabel || seatNumber) {
    return `Rand ${rowLabel ?? "-"} / loc ${seatNumber ?? "-"}`;
  }

  const parsedLabel = parseSimpleSeatLabel(input.seatLabel);

  if (parsedLabel) {
    return `Rand ${parsedLabel.rowLabel} / loc ${parsedLabel.seatNumber}`;
  }

  return input.seatLabel?.trim() || "-";
}

export function formatSectorSeatPosition(input: SectorSeatPositionInput) {
  const seatPosition = formatSeatPosition(input);

  if (!input.sectorName) {
    return seatPosition;
  }

  return `${input.sectorName} - ${seatPosition}`;
}

function normalizeSeatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function parseSimpleSeatLabel(seatLabel: string | null | undefined) {
  const normalized = seatLabel?.trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(.+?)[\s/-]+(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    rowLabel: match[1].trim(),
    seatNumber: match[2].trim(),
  };
}
