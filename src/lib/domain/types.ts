import { z } from "zod";

import { roleValues } from "@/lib/auth/roles";

export const roleSchema = z.enum(roleValues);
export const matchStatusSchema = z.enum([
  "draft",
  "published",
  "closed",
  "completed",
  "canceled",
]);
export const reservationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "expired",
  "canceled",
]);
export const ticketStatusSchema = z.enum([
  "active",
  "used",
  "canceled",
  "blocked",
]);
export const seatAvailabilitySchema = z.enum([
  "available",
  "selected",
  "held",
  "reserved",
  "disabled",
  "blocked",
  "obstructed",
  "internal",
]);
export const scanResultSchema = z.enum([
  "valid",
  "already_used",
  "invalid_token",
  "wrong_match",
  "canceled",
  "blocked",
  "not_found",
]);

export const viewerContextSchema = z.object({
  userId: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
  fullName: z.string().nullable(),
  roles: z.array(roleSchema),
  reservationBlockedUntil: z.string().datetime().nullable().optional(),
  reservationBlockReason: z.string().nullable().optional(),
});

export type ViewerContext = z.infer<typeof viewerContextSchema> & {
  isAuthenticated: boolean;
  isPrivileged: boolean;
  isAdmin: boolean;
};

export const publicMatchSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  competitionName: z.string(),
  opponentName: z.string(),
  stadiumName: z.string(),
  city: z.string(),
  description: z.string().nullable().default(null),
  posterUrl: z.string().nullable().default(null),
  bannerUrl: z.string().nullable().default(null),
  startsAt: z.string(),
  status: matchStatusSchema,
  maxTicketsPerUser: z.coerce.number().int().nonnegative(),
  reservationOpensAt: z.string().nullable().default(null),
  reservationClosesAt: z.string().nullable().default(null),
  issuedCount: z.coerce.number().int().nonnegative().default(0),
  scannedCount: z.coerce.number().int().nonnegative().default(0),
  availableEstimate: z.coerce.number().int().nonnegative().default(0),
  scannerEnabled: z.boolean().default(false),
});

export type PublicMatch = z.infer<typeof publicMatchSchema>;

export const sectorSummarySchema = z.object({
  sectorId: z.string(),
  code: z.string(),
  name: z.string(),
  color: z.string(),
  rowsCount: z.coerce.number().int().nonnegative(),
  seatsCount: z.coerce.number().int().nonnegative(),
  availableCount: z.coerce.number().int().nonnegative(),
  heldCount: z.coerce.number().int().nonnegative(),
  reservedCount: z.coerce.number().int().nonnegative(),
  blockedCount: z.coerce.number().int().nonnegative(),
});

export type SectorSummary = z.infer<typeof sectorSummarySchema>;

export const seatMapSeatSchema = z.object({
  seatId: z.string(),
  sectorId: z.string(),
  sectorCode: z.string(),
  sectorName: z.string(),
  sectorColor: z.string(),
  rowLabel: z.string(),
  seatNumber: z.coerce.number().int().nonnegative(),
  seatLabel: z.string(),
  availability: seatAvailabilitySchema,
  holdExpiresAt: z.string().nullable().default(null),
  heldByCurrentUser: z.boolean().default(false),
  gateName: z.string().nullable().default(null),
});

export type SeatMapSeat = z.infer<typeof seatMapSeatSchema>;

export const seatMapSectorSchema = z.object({
  sectorId: z.string(),
  code: z.string(),
  name: z.string(),
  color: z.string(),
  seats: z.array(seatMapSeatSchema),
});

export type SeatMapSector = z.infer<typeof seatMapSectorSchema>;

export const ticketCardSchema = z.object({
  ticketId: z.string(),
  reservationId: z.string(),
  matchId: z.string(),
  matchSlug: z.string(),
  ticketCode: z.string(),
  status: ticketStatusSchema,
  source: z.string(),
  qrTokenVersion: z.coerce.number().int().nonnegative(),
  issuedAt: z.string(),
  usedAt: z.string().nullable().default(null),
  matchTitle: z.string(),
  competitionName: z.string(),
  opponentName: z.string(),
  startsAt: z.string(),
  stadiumName: z.string(),
  sectorName: z.string(),
  sectorCode: z.string(),
  sectorColor: z.string(),
  rowLabel: z.string(),
  seatNumber: z.coerce.number().int().nonnegative(),
  seatLabel: z.string(),
  gateName: z.string().nullable().default(null),
  purchaserName: z.string().nullable().default(null),
  purchaserEmail: z.string().nullable().default(null),
});

export type TicketCard = z.infer<typeof ticketCardSchema>;

export const adminMatchOverviewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  competitionName: z.string(),
  opponentName: z.string(),
  stadiumName: z.string(),
  startsAt: z.string(),
  status: matchStatusSchema,
  scannerEnabled: z.boolean(),
  maxTicketsPerUser: z.coerce.number().int().nonnegative(),
  issuedCount: z.coerce.number().int().nonnegative(),
  scannedCount: z.coerce.number().int().nonnegative(),
  noShowCount: z.coerce.number().int().nonnegative(),
  duplicateScanAttempts: z.coerce.number().int().nonnegative(),
});

export type AdminMatchOverview = z.infer<typeof adminMatchOverviewSchema>;

export const adminUserOverviewSchema = z.object({
  userId: z.string(),
  email: z.string().nullable().default(null),
  fullName: z.string().nullable().default(null),
  roles: z.array(z.string()),
  totalReserved: z.coerce.number().int().nonnegative(),
  totalScanned: z.coerce.number().int().nonnegative(),
  noShowRatio: z.coerce.number().default(0),
  abuseScore: z.coerce.number().default(0),
  activeBlockType: z.string().nullable().default(null),
  activeBlockUntil: z.string().nullable().default(null),
});

export type AdminUserOverview = z.infer<typeof adminUserOverviewSchema>;

export const stadiumSeatSchema = z.object({
  id: z.string(),
  rowLabel: z.string(),
  seatNumber: z.coerce.number().int().nonnegative(),
  seatLabel: z.string(),
  isDisabled: z.boolean(),
  isObstructed: z.boolean(),
  isInternalOnly: z.boolean(),
});

export type StadiumSeat = z.infer<typeof stadiumSeatSchema>;

export const stadiumSectorSchema = z.object({
  id: z.string(),
  stadiumId: z.string(),
  name: z.string(),
  code: z.string(),
  color: z.string(),
  rowsCount: z.coerce.number().int().nonnegative(),
  seatsPerRow: z.coerce.number().int().nonnegative(),
  seats: z.array(stadiumSeatSchema),
});

export type StadiumSector = z.infer<typeof stadiumSectorSchema>;

export const stadiumBuilderSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  city: z.string(),
  sectors: z.array(stadiumSectorSchema),
});

export type StadiumBuilder = z.infer<typeof stadiumBuilderSchema>;

export const scannerMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  opponentName: z.string(),
  startsAt: z.string(),
  scannerEnabled: z.boolean(),
});

export type ScannerMatch = z.infer<typeof scannerMatchSchema>;

export const scanResponseSchema = z.object({
  result: scanResultSchema,
  message: z.string(),
  ticketCode: z.string().nullable().default(null),
  matchTitle: z.string().nullable().default(null),
  seatLabel: z.string().nullable().default(null),
  sectorLabel: z.string().nullable().default(null),
  scannedAt: z.string().nullable().default(null),
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;
