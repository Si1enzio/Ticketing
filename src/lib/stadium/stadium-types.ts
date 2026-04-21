import type { AppLocale } from "@/lib/i18n/config";
import type { SeatMapSeat, SeatMapSector } from "@/lib/domain/types";

export type SectorShapeType =
  | "rectangle"
  | "trapezoid"
  | "arc"
  | "curve-left"
  | "curve-right"
  | "polygon"
  | "custom-path";

export type StadiumSeatStatus =
  | "available"
  | "selected"
  | "held"
  | "reserved"
  | "sold"
  | "blocked"
  | "unavailable";

export type LocalizedLabel = Partial<Record<AppLocale, string>>;

type ShapeBase = {
  type: SectorShapeType;
  labelPosition?: { x: number; y: number };
};

export type RectangleSectorShape = ShapeBase & {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
};

export type TrapezoidSectorShape = ShapeBase & {
  type: "trapezoid";
  x: number;
  y: number;
  topWidth: number;
  bottomWidth: number;
  height: number;
  skew?: number;
};

export type ArcSectorShape = ShapeBase & {
  type: "arc";
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

export type CurveSectorShape = ShapeBase & {
  type: "curve-left" | "curve-right";
  x: number;
  y: number;
  width: number;
  height: number;
  curveDepth: number;
};

export type PolygonSectorShape = ShapeBase & {
  type: "polygon";
  points: Array<{ x: number; y: number }>;
};

export type CustomPathSectorShape = ShapeBase & {
  type: "custom-path";
  path: string;
};

export type SectorShapeConfig =
  | RectangleSectorShape
  | TrapezoidSectorShape
  | ArcSectorShape
  | CurveSectorShape
  | PolygonSectorShape
  | CustomPathSectorShape;

export type DecorativeElement =
  | {
      id: string;
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      id: string;
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      preset?: "football-pitch";
      fill?: string;
      opacity?: number;
    }
  | {
      id: string;
      kind: "path";
      path: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      id: string;
      kind: "text";
      x: number;
      y: number;
      value: string;
      fill?: string;
      fontSize?: number;
      textAnchor?: "start" | "middle" | "end";
      opacity?: number;
    };

export type SeatConfig = {
  key: string;
  kind: "seat" | "gap" | "aisle" | "stair";
  number?: number;
  label?: string;
  isVisible?: boolean;
  isBookable?: boolean;
};

export type RowConfig = {
  id: string;
  label: string;
  sortOrder: number;
  isVisible?: boolean;
  seats: SeatConfig[];
};

export type SectorConfig = {
  id: string;
  code: string;
  defaultLabel: string;
  labels?: LocalizedLabel;
  mapTitle?: string;
  mapTitleLabels?: LocalizedLabel;
  mapSubtitle?: string;
  mapSubtitleLabels?: LocalizedLabel;
  tribuneId: string;
  tierId?: string | null;
  shape: SectorShapeConfig;
  isVisible?: boolean;
  isBookable?: boolean;
  isHiddenFromOverview?: boolean;
  rowConfigs?: RowConfig[];
  notes?: string[];
};

export type TierConfig = {
  id: string;
  tribuneId: string;
  defaultLabel: string;
  labels?: LocalizedLabel;
  sectorCodes: string[];
  isVisible?: boolean;
  isBookable?: boolean;
  sortOrder?: number;
};

export type TribuneConfig = {
  id: string;
  defaultLabel: string;
  shortLabel?: string;
  labels?: LocalizedLabel;
  color: string;
  sectorCodes: string[];
  tierIds?: string[];
  isVisible?: boolean;
  isBookable?: boolean;
  sortOrder?: number;
};

export type StadiumMapConfig = {
  mapKey: string;
  defaultLabel: string;
  labels?: LocalizedLabel;
  viewBox: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  };
  tribunes: TribuneConfig[];
  tiers?: TierConfig[];
  sectors: SectorConfig[];
  decorations?: DecorativeElement[];
};

export type StadiumMapRegistryEntry = {
  mapKey: string;
  stadiumAliases: string[];
  config: StadiumMapConfig;
};

export type StadiumSectorSummary = {
  sectorId: string;
  code: string;
  name: string;
  color: string;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  reservedSeats: number;
  blockedSeats: number;
  selectedSeats: number;
};

export type StadiumSeatLayoutCell =
  | {
      key: string;
      kind: "seat";
      seat: SeatMapSeat;
      status: StadiumSeatStatus;
      isSelected: boolean;
    }
  | {
      key: string;
      kind: "gap" | "aisle" | "stair";
      label?: string;
    };

export type StadiumSeatRow = {
  id: string;
  label: string;
  cells: StadiumSeatLayoutCell[];
};

export type StadiumMapResolved = {
  mapKey: string;
  config: StadiumMapConfig;
  isFallback: boolean;
};

export type StadiumMapLookup = {
  stadiumId?: string | null;
  stadiumSlug?: string | null;
  stadiumName?: string | null;
  mapKey?: string | null;
};

export type StadiumRenderableSector = {
  config: SectorConfig;
  data: SeatMapSector | null;
  summary: StadiumSectorSummary | null;
};
