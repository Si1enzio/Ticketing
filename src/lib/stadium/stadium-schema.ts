import { z } from "zod";

const localizedLabelSchema = z.record(z.string(), z.string()).optional();

const shapeBaseSchema = z.object({
  labelPosition: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

const rectangleSectorShapeSchema = shapeBaseSchema.extend({
  type: z.literal("rectangle"),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rx: z.number().optional(),
});

const trapezoidSectorShapeSchema = shapeBaseSchema.extend({
  type: z.literal("trapezoid"),
  x: z.number(),
  y: z.number(),
  topWidth: z.number(),
  bottomWidth: z.number(),
  height: z.number(),
  skew: z.number().optional(),
});

const arcSectorShapeSchema = shapeBaseSchema.extend({
  type: z.literal("arc"),
  cx: z.number(),
  cy: z.number(),
  innerRadius: z.number(),
  outerRadius: z.number(),
  startAngle: z.number(),
  endAngle: z.number(),
});

const curveSectorShapeSchema = shapeBaseSchema.extend({
  type: z.union([z.literal("curve-left"), z.literal("curve-right")]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  curveDepth: z.number(),
});

const polygonSectorShapeSchema = shapeBaseSchema.extend({
  type: z.literal("polygon"),
  points: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
    }),
  ),
});

const customPathSectorShapeSchema = shapeBaseSchema.extend({
  type: z.literal("custom-path"),
  path: z.string().min(1),
});

export const sectorShapeConfigSchema = z.discriminatedUnion("type", [
  rectangleSectorShapeSchema,
  trapezoidSectorShapeSchema,
  arcSectorShapeSchema,
  curveSectorShapeSchema,
  polygonSectorShapeSchema,
  customPathSectorShapeSchema,
]);

const seatConfigSchema = z.object({
  key: z.string(),
  kind: z.enum(["seat", "gap", "aisle", "stair"]),
  number: z.number().optional(),
  label: z.string().optional(),
  isVisible: z.boolean().optional(),
  isBookable: z.boolean().optional(),
});

const rowConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  sortOrder: z.number(),
  isVisible: z.boolean().optional(),
  seats: z.array(seatConfigSchema),
});

const decorativeElementSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("line"),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
    opacity: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("rect"),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rx: z.number().optional(),
    preset: z.enum(["football-pitch"]).optional(),
    fill: z.string().optional(),
    opacity: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("path"),
    path: z.string(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
    opacity: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("text"),
    x: z.number(),
    y: z.number(),
    value: z.string(),
    fill: z.string().optional(),
    fontSize: z.number().optional(),
    textAnchor: z.enum(["start", "middle", "end"]).optional(),
    opacity: z.number().optional(),
  }),
]);

export const sectorConfigSchema = z.object({
  id: z.string(),
  code: z.string(),
  defaultLabel: z.string(),
  labels: localizedLabelSchema,
  mapTitle: z.string().optional(),
  mapTitleLabels: localizedLabelSchema,
  mapSubtitle: z.string().optional(),
  mapSubtitleLabels: localizedLabelSchema,
  tribuneId: z.string(),
  tierId: z.string().nullable().optional(),
  shape: sectorShapeConfigSchema,
  isVisible: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  isHiddenFromOverview: z.boolean().optional(),
  rowConfigs: z.array(rowConfigSchema).optional(),
  notes: z.array(z.string()).optional(),
});

export const tribuneConfigSchema = z.object({
  id: z.string(),
  defaultLabel: z.string(),
  shortLabel: z.string().optional(),
  labels: localizedLabelSchema,
  color: z.string(),
  sectorCodes: z.array(z.string()),
  tierIds: z.array(z.string()).optional(),
  isVisible: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const tierConfigSchema = z.object({
  id: z.string(),
  tribuneId: z.string(),
  defaultLabel: z.string(),
  labels: localizedLabelSchema,
  sectorCodes: z.array(z.string()),
  isVisible: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const stadiumMapConfigSchema = z.object({
  mapKey: z.string().min(1),
  defaultLabel: z.string().min(1),
  labels: localizedLabelSchema,
  viewBox: z.object({
    minX: z.number(),
    minY: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  tribunes: z.array(tribuneConfigSchema),
  tiers: z.array(tierConfigSchema).optional(),
  sectors: z.array(sectorConfigSchema),
  decorations: z.array(decorativeElementSchema).optional(),
});

export type StadiumMapConfigInput = z.infer<typeof stadiumMapConfigSchema>;
