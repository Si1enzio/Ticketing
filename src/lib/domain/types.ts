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
export const ticketingModeSchema = z.enum(["free", "paid"]);
export const subscriptionDurationSchema = z.enum(["annual", "semiannual"]);
export const subscriptionStatusSchema = z.enum(["active", "expired", "canceled"]);
export const profileGenderSchema = z.enum([
  "male",
  "female",
  "other",
  "unspecified",
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
export const matchSeatOverrideStatusSchema = z.enum(["blocked", "admin_hold"]);
export const accessCredentialKindSchema = z.enum(["ticket", "subscription"]);

export const viewerContextSchema = z.object({
  userId: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
  fullName: z.string().nullable(),
  roles: z.array(roleSchema),
  canReserve: z.boolean().default(false),
  reservationBlockedUntil: z.string().datetime().nullable().optional(),
  reservationBlockReason: z.string().nullable().optional(),
});

export type ViewerContext = z.infer<typeof viewerContextSchema> & {
  isAuthenticated: boolean;
  isPrivileged: boolean;
  isAdmin: boolean;
};

export const profileDetailsSchema = z.object({
  userId: z.string(),
  email: z.string().email().nullable().default(null),
  contactEmail: z.string().email().nullable().default(null),
  fullName: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  locality: z.string().nullable().default(null),
  district: z.string().nullable().default(null),
  birthDate: z.string().nullable().default(null),
  gender: profileGenderSchema.default("unspecified"),
  preferredLanguage: z.string().default("ro"),
  marketingOptIn: z.boolean().default(false),
  smsOptIn: z.boolean().default(false),
  canReserve: z.boolean().default(false),
});

export type ProfileDetails = z.infer<typeof profileDetailsSchema>;

export const publicMatchSchema = z.object({
  id: z.string().uuid(),
  stadiumId: z.string(),
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
  ticketingMode: ticketingModeSchema.default("free"),
  ticketPriceCents: z.coerce.number().int().nonnegative().default(0),
  currency: z.string().default("MDL"),
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
  ticketPriceCents: z.coerce.number().int().nonnegative().default(0),
  currency: z.string().default("MDL"),
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

export const matchSeatOverrideSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  seatId: z.string(),
  status: matchSeatOverrideStatusSchema,
  expiresAt: z.string().nullable().default(null),
  note: z.string().nullable().default(null),
  createdAt: z.string(),
});

export type MatchSeatOverride = z.infer<typeof matchSeatOverrideSchema>;

export const matchSectorPricingOverrideSchema = z.object({
  sectorId: z.string(),
  ticketPriceCentsOverride: z.coerce.number().int().nonnegative().nullable().default(null),
});

export type MatchSectorPricingOverride = z.infer<typeof matchSectorPricingOverrideSchema>;

export const ticketCardSchema = z.object({
  ticketId: z.string(),
  reservationId: z.string(),
  matchId: z.string(),
  stadiumId: z.string(),
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
  stadiumId: z.string(),
  slug: z.string(),
  title: z.string(),
  competitionName: z.string(),
  opponentName: z.string(),
  stadiumName: z.string(),
  startsAt: z.string(),
  status: matchStatusSchema,
  scannerEnabled: z.boolean(),
  maxTicketsPerUser: z.coerce.number().int().nonnegative(),
  reservationOpensAt: z.string().nullable().default(null),
  reservationClosesAt: z.string().nullable().default(null),
  issuedCount: z.coerce.number().int().nonnegative(),
  scannedCount: z.coerce.number().int().nonnegative(),
  noShowCount: z.coerce.number().int().nonnegative(),
  duplicateScanAttempts: z.coerce.number().int().nonnegative(),
  ticketingMode: ticketingModeSchema.default("free"),
  ticketPriceCents: z.coerce.number().int().nonnegative().default(0),
  currency: z.string().default("MDL"),
});

export type AdminMatchOverview = z.infer<typeof adminMatchOverviewSchema>;

export const adminUserOverviewSchema = z.object({
  userId: z.string(),
  email: z.string().nullable().default(null),
  fullName: z.string().nullable().default(null),
  roles: z.array(z.string()),
  canReserve: z.boolean().default(false),
  totalReserved: z.coerce.number().int().nonnegative(),
  totalScanned: z.coerce.number().int().nonnegative(),
  noShowRatio: z.coerce.number().default(0),
  abuseScore: z.coerce.number().default(0),
  activeBlockType: z.string().nullable().default(null),
  activeBlockUntil: z.string().nullable().default(null),
});

export type AdminUserOverview = z.infer<typeof adminUserOverviewSchema>;

export const stadiumStandSchema = z.object({
  id: z.string(),
  stadiumId: z.string(),
  name: z.string(),
  code: z.string(),
  color: z.string(),
  sectors: z.array(z.string()).default([]),
});

export type StadiumStand = z.infer<typeof stadiumStandSchema>;

export const stadiumGateSchema = z.object({
  id: z.string(),
  stadiumId: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable().default(null),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type StadiumGate = z.infer<typeof stadiumGateSchema>;

export const stadiumSponsorSchema = z.object({
  id: z.string(),
  stadiumId: z.string(),
  name: z.string(),
  logoUrl: z.string(),
  websiteUrl: z.string().nullable().default(null),
  sortOrder: z.coerce.number().int().default(0),
});

export type StadiumSponsor = z.infer<typeof stadiumSponsorSchema>;

export const teamOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type TeamOption = z.infer<typeof teamOptionSchema>;

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
  standId: z.string().nullable().default(null),
  gateId: z.string().nullable().default(null),
  gateName: z.string().nullable().default(null),
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
  stands: z.array(stadiumStandSchema).default([]),
  gates: z.array(stadiumGateSchema).default([]),
  sponsors: z.array(stadiumSponsorSchema).default([]),
  sectors: z.array(stadiumSectorSchema),
});

export type StadiumBuilder = z.infer<typeof stadiumBuilderSchema>;

export const checkoutItemSchema = z.object({
  seatId: z.string(),
  sectorName: z.string(),
  rowLabel: z.string(),
  seatNumber: z.coerce.number().int().nonnegative(),
  gateName: z.string().nullable().default(null),
  priceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().default("MDL"),
});

export type CheckoutItem = z.infer<typeof checkoutItemSchema>;

export const checkoutSummarySchema = z.object({
  holdToken: z.string().uuid(),
  matchId: z.string().uuid(),
  matchSlug: z.string(),
  matchTitle: z.string(),
  startsAt: z.string(),
  stadiumName: z.string(),
  ticketingMode: ticketingModeSchema,
  ticketPriceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().default("MDL"),
  totalAmountCents: z.coerce.number().int().nonnegative(),
  expiresAt: z.string(),
  items: z.array(checkoutItemSchema),
});

export type CheckoutSummary = z.infer<typeof checkoutSummarySchema>;

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
  credentialKind: accessCredentialKindSchema.default("ticket"),
  ticketCode: z.string().nullable().default(null),
  matchTitle: z.string().nullable().default(null),
  seatLabel: z.string().nullable().default(null),
  sectorLabel: z.string().nullable().default(null),
  scannedAt: z.string().nullable().default(null),
  holderName: z.string().nullable().default(null),
  holderBirthDate: z.string().nullable().default(null),
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;

export const matchReportSchema = z.object({
  matchId: z.string(),
  slug: z.string(),
  title: z.string(),
  competitionName: z.string(),
  opponentName: z.string(),
  stadiumName: z.string(),
  startsAt: z.string(),
  status: matchStatusSchema,
  issuedCount: z.coerce.number().int().nonnegative(),
  purchasedCount: z.coerce.number().int().nonnegative(),
  internalCount: z.coerce.number().int().nonnegative(),
  enteredCount: z.coerce.number().int().nonnegative(),
  activeCount: z.coerce.number().int().nonnegative(),
  canceledCount: z.coerce.number().int().nonnegative(),
  blockedCount: z.coerce.number().int().nonnegative(),
  repeatedCount: z.coerce.number().int().nonnegative(),
  validScanCount: z.coerce.number().int().nonnegative(),
  invalidScanCount: z.coerce.number().int().nonnegative(),
  latestScanAt: z.string().nullable().default(null),
});

export type MatchReport = z.infer<typeof matchReportSchema>;

export const scanLogEntrySchema = z.object({
  id: z.string(),
  matchId: z.string(),
  matchSlug: z.string(),
  matchTitle: z.string(),
  scannedAt: z.string(),
  result: scanResultSchema,
  credentialKind: accessCredentialKindSchema.default("ticket"),
  deviceLabel: z.string().nullable().default(null),
  tokenFingerprint: z.string().nullable().default(null),
  ticketId: z.string().nullable().default(null),
  ticketCode: z.string().nullable().default(null),
  ticketStatus: ticketStatusSchema.nullable().default(null),
  ticketSource: z.string().nullable().default(null),
  subscriptionId: z.string().nullable().default(null),
  subscriptionCode: z.string().nullable().default(null),
  subscriptionStatus: subscriptionStatusSchema.nullable().default(null),
  seatLabel: z.string().nullable().default(null),
  rowLabel: z.string().nullable().default(null),
  seatNumber: z.coerce.number().int().nullable().default(null),
  sectorName: z.string().nullable().default(null),
  sectorCode: z.string().nullable().default(null),
  standName: z.string().nullable().default(null),
  gateName: z.string().nullable().default(null),
  stewardUserId: z.string().nullable().default(null),
  stewardName: z.string().nullable().default(null),
  stewardEmail: z.string().nullable().default(null),
  holderUserId: z.string().nullable().default(null),
  holderName: z.string().nullable().default(null),
  holderEmail: z.string().nullable().default(null),
  holderBirthDate: z.string().nullable().default(null),
});

export type ScanLogEntry = z.infer<typeof scanLogEntrySchema>;

export const adminUserStatsSchema = z.object({
  userId: z.string(),
  email: z.string().nullable().default(null),
  fullName: z.string().nullable().default(null),
  canReserve: z.boolean().default(false),
  roles: z.array(z.string()).default([]),
  totalReserved: z.coerce.number().int().nonnegative(),
  totalScanned: z.coerce.number().int().nonnegative(),
  noShowRatio: z.coerce.number().default(0),
  abuseScore: z.coerce.number().default(0),
  activeBlockType: z.string().nullable().default(null),
  activeBlockUntil: z.string().nullable().default(null),
  paidTickets: z.coerce.number().int().nonnegative(),
  nonPaidTickets: z.coerce.number().int().nonnegative(),
  usedTickets: z.coerce.number().int().nonnegative(),
  canceledTickets: z.coerce.number().int().nonnegative(),
  activeSubscriptions: z.coerce.number().int().nonnegative(),
  totalPaidCents: z.coerce.number().int().nonnegative(),
  lastEntryAt: z.string().nullable().default(null),
});

export type AdminUserStats = z.infer<typeof adminUserStatsSchema>;

export const subscriptionProductSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  durationType: subscriptionDurationSchema,
  durationMonths: z.coerce.number().int().positive(),
  priceCents: z.coerce.number().int().nonnegative(),
  currency: z.string().default("MDL"),
  description: z.string().nullable().default(null),
  isActive: z.boolean().default(true),
});

export type SubscriptionProduct = z.infer<typeof subscriptionProductSchema>;

export const userSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: subscriptionStatusSchema,
  startsAt: z.string(),
  endsAt: z.string(),
  pricePaidCents: z.coerce.number().int().nonnegative(),
  currency: z.string().default("MDL"),
  source: z.string(),
  note: z.string().nullable().default(null),
  subscriptionCode: z.string(),
  qrTokenVersion: z.coerce.number().int().positive().default(1),
  stadiumId: z.string().nullable().default(null),
  stadiumName: z.string().nullable().default(null),
  seatId: z.string().nullable().default(null),
  sectorName: z.string().nullable().default(null),
  sectorCode: z.string().nullable().default(null),
  sectorColor: z.string().nullable().default(null),
  rowLabel: z.string().nullable().default(null),
  seatNumber: z.coerce.number().int().nullable().default(null),
  seatLabel: z.string().nullable().default(null),
  gateName: z.string().nullable().default(null),
  holderName: z.string().nullable().default(null),
  holderEmail: z.string().nullable().default(null),
  holderBirthDate: z.string().nullable().default(null),
  product: subscriptionProductSchema,
});

export type UserSubscription = z.infer<typeof userSubscriptionSchema>;
