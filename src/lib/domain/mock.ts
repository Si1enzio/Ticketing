import type {
  AdminMatchOverview,
  AdminUserOverview,
  PublicMatch,
  ScannerMatch,
  SeatMapSector,
  TicketCard,
  ViewerContext,
} from "@/lib/domain/types";

function buildSeats(
  sectorId: string,
  sectorCode: string,
  sectorName: string,
  sectorColor: string,
  rows: number,
  seatsPerRow: number,
  blocked: string[] = [],
  reserved: string[] = [],
): SeatMapSector {
  const seats = Array.from({ length: rows }).flatMap((_, rowIndex) =>
    Array.from({ length: seatsPerRow }).map((__, seatIndex) => {
      const rowLabel = String(rowIndex + 1);
      const seatNumber = seatIndex + 1;
      const seatLabel = `${rowLabel}-${seatNumber}`;
      const key = `${rowLabel}-${seatNumber}`;

      const availability: SeatMapSector["seats"][number]["availability"] = blocked.includes(key)
        ? "blocked"
        : reserved.includes(key)
          ? "reserved"
          : "available";

      return {
        seatId: `${sectorId}-${seatLabel}`,
        sectorId,
        sectorCode,
        sectorName,
        sectorColor,
        rowLabel,
        seatNumber,
        seatLabel,
        availability,
        holdExpiresAt: null,
        heldByCurrentUser: false,
        gateName: sectorCode.startsWith("V") ? "Poarta Vest" : "Poarta Est",
        ticketPriceCents: 0,
        currency: "MDL",
      };
    }),
  );

  return {
    sectorId,
    code: sectorCode,
    name: sectorName,
    color: sectorColor,
    seats,
  };
}

export const mockViewer: ViewerContext = {
  userId: null,
  email: null,
  fullName: null,
  roles: ["guest"],
  organizerIds: [],
  locationIds: [],
  canReserve: false,
  reservationBlockedUntil: null,
  reservationBlockReason: null,
  isAuthenticated: false,
  isPrivileged: false,
  isAdmin: false,
};

export const mockMatches: PublicMatch[] = [
  {
    id: "6dcb4147-e12c-4f6b-a06d-111111111111",
    stadiumId: "demo-stadium",
    slug: "ticket-hub-sport-demo",
    title: "Eveniment sportiv demo",
    competitionName: "Sport",
    opponentName: "Oaspete demo",
    stadiumName: "Arena demo",
    city: "Chisinau",
    description:
      "Eveniment sportiv cu acces gratuit, locuri selectabile si bilete nominale cu QR unic.",
    posterUrl: null,
    bannerUrl: null,
    startsAt: "2026-05-02T16:00:00.000Z",
    status: "published",
    maxTicketsPerUser: 4,
    reservationOpensAt: "2026-04-20T08:00:00.000Z",
    reservationClosesAt: "2026-05-02T13:00:00.000Z",
    initialHoldSeconds: 90,
    freeTicketConfirmedHoldSeconds: 300,
    paidTicketConfirmedHoldSeconds: 600,
    allowGuestHold: true,
    requireLoginBeforeHold: false,
    issuedCount: 184,
    scannedCount: 0,
    availableEstimate: 376,
    scannerEnabled: true,
    ticketingMode: "free",
    ticketPriceCents: 0,
    currency: "MDL",
  },
  {
    id: "7e1f2262-a5f6-44b0-a06d-222222222222",
    stadiumId: "demo-stadium",
    slug: "ticket-hub-premium-demo",
    title: "Eveniment premium demo",
    competitionName: "Alte evenimente",
    opponentName: "Invitat demo",
    stadiumName: "Arena demo",
    city: "Chisinau",
    description:
      "Eveniment cu acces pe sectoare, pregatit pentru bilete cu plata si zone rezervate.",
    posterUrl: null,
    bannerUrl: null,
    startsAt: "2026-05-18T17:30:00.000Z",
    status: "published",
    maxTicketsPerUser: 4,
    reservationOpensAt: "2026-05-05T08:00:00.000Z",
    reservationClosesAt: "2026-05-18T14:30:00.000Z",
    initialHoldSeconds: 90,
    freeTicketConfirmedHoldSeconds: 300,
    paidTicketConfirmedHoldSeconds: 600,
    allowGuestHold: true,
    requireLoginBeforeHold: false,
    issuedCount: 92,
    scannedCount: 0,
    availableEstimate: 468,
    scannerEnabled: false,
    ticketingMode: "paid",
    ticketPriceCents: 15000,
    currency: "MDL",
  },
];

export const mockSeatMap: SeatMapSector[] = [
  buildSeats("sector-v1", "V1", "Tribuna Vest A", "#2f9e44", 5, 10, ["1-1", "1-2"], [
    "3-4",
    "3-5",
    "4-7",
  ]),
  buildSeats("sector-v2", "V2", "Tribuna Vest B", "#f08c00", 5, 10, ["2-9"], [
    "1-10",
    "2-10",
  ]),
  buildSeats("sector-e1", "E1", "Tribuna Est", "#1c7ed6", 5, 12, ["5-1", "5-2"], [
    "2-4",
    "2-5",
    "2-6",
  ]),
  buildSeats("sector-n", "N", "Peluza Nord", "#364fc7", 4, 14, ["4-14"], ["1-7"]),
];

export const mockTickets: TicketCard[] = [
  {
    ticketId: "5f650b5b-0cb5-4bc7-91b3-333333333333",
    reservationId: "e58dc39c-091e-41f4-bccb-444444444444",
    matchId: mockMatches[0].id,
    stadiumId: "demo-stadium",
    matchSlug: mockMatches[0].slug,
    ticketCode: "THB-DEMO-7Q4Z81",
    status: "active",
    source: "public_reservation",
    qrTokenVersion: 1,
    issuedAt: "2026-04-17T09:15:00.000Z",
    usedAt: null,
    matchTitle: mockMatches[0].title,
    competitionName: mockMatches[0].competitionName,
    opponentName: mockMatches[0].opponentName,
    startsAt: mockMatches[0].startsAt,
    stadiumName: mockMatches[0].stadiumName,
    sectorName: "Tribuna Vest A",
    sectorCode: "V1",
    sectorColor: "#2f9e44",
    rowLabel: "3",
    seatNumber: 6,
    seatLabel: "3-6",
    gateName: "Poarta Vest",
    purchaserName: "Demo Participant",
    purchaserEmail: "demo@example.com",
  },
];

export const mockAdminMatches: AdminMatchOverview[] = mockMatches.map((match) => ({
  id: match.id,
  stadiumId: "demo-stadium",
  slug: match.slug,
  title: match.title,
  competitionName: match.competitionName,
  opponentName: match.opponentName,
  stadiumName: match.stadiumName,
  posterUrl: match.posterUrl,
  bannerUrl: match.bannerUrl,
  startsAt: match.startsAt,
  status: match.status,
  scannerEnabled: match.scannerEnabled,
  maxTicketsPerUser: match.maxTicketsPerUser,
  reservationOpensAt: match.reservationOpensAt,
  reservationClosesAt: match.reservationClosesAt,
  initialHoldSeconds: match.initialHoldSeconds,
  freeTicketConfirmedHoldSeconds: match.freeTicketConfirmedHoldSeconds,
  paidTicketConfirmedHoldSeconds: match.paidTicketConfirmedHoldSeconds,
  allowGuestHold: match.allowGuestHold,
  requireLoginBeforeHold: match.requireLoginBeforeHold,
  issuedCount: match.issuedCount,
  scannedCount: match.scannedCount,
  archivedAt: null,
  noShowCount: Math.max(match.issuedCount - match.scannedCount, 0),
  duplicateScanAttempts: match.id === mockMatches[0].id ? 2 : 0,
  ticketingMode: match.ticketingMode,
  ticketPriceCents: match.ticketPriceCents,
  currency: match.currency,
}));

export const mockAdminUsers: AdminUserOverview[] = [
  {
    userId: "37c8fe91-d64a-436f-9df0-555555555555",
    email: "participant.demo@example.com",
    fullName: "Andrei Munteanu",
    roles: ["user"],
    canReserve: true,
    registeredAt: "2026-03-10T09:00:00.000Z",
    totalReserved: 6,
    totalScanned: 2,
    noShowRatio: 0.66,
    abuseScore: 58,
    activeBlockType: null,
    activeBlockUntil: null,
    lastTicketIssuedAt: "2026-04-20T12:00:00.000Z",
    lastValidScanAt: "2026-04-20T17:15:00.000Z",
  },
  {
    userId: "824dd0d1-bb1c-441c-b5f6-666666666666",
    email: "operator.demo@example.com",
    fullName: "Irina Cebotari",
    roles: ["steward"],
    canReserve: false,
    registeredAt: "2026-02-04T08:30:00.000Z",
    totalReserved: 0,
    totalScanned: 0,
    noShowRatio: 0,
    abuseScore: 0,
    activeBlockType: null,
    activeBlockUntil: null,
    lastTicketIssuedAt: null,
    lastValidScanAt: null,
  },
];

export const mockScannerMatches: ScannerMatch[] = mockMatches.map((match) => ({
  id: match.id,
  title: match.title,
  opponentName: match.opponentName,
  stadiumName: match.stadiumName,
  competitionName: match.competitionName,
  status: match.status,
  startsAt: match.startsAt,
  scannerEnabled: match.scannerEnabled,
}));
