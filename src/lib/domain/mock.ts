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
  reservationBlockedUntil: null,
  reservationBlockReason: null,
  isAuthenticated: false,
  isPrivileged: false,
  isAdmin: false,
};

export const mockMatches: PublicMatch[] = [
  {
    id: "6dcb4147-e12c-4f6b-a06d-111111111111",
    slug: "milsami-orhei-fc-zimbru-chisinau",
    title: "FC Milsami Orhei vs FC Zimbru Chișinău",
    competitionName: "Super Liga Moldovei",
    opponentName: "FC Zimbru Chișinău",
    stadiumName: "Stadionul Municipal „Orhei”",
    city: "Orhei",
    description:
      "Derby de campionat cu acces gratuit pe bază de rezervare. Locurile sunt limitate, iar biletele sunt nominale.",
    posterUrl: null,
    bannerUrl: null,
    startsAt: "2026-05-02T16:00:00.000Z",
    status: "published",
    maxTicketsPerUser: 4,
    reservationOpensAt: "2026-04-20T08:00:00.000Z",
    reservationClosesAt: "2026-05-02T13:00:00.000Z",
    issuedCount: 184,
    scannedCount: 0,
    availableEstimate: 376,
    scannerEnabled: true,
  },
  {
    id: "7e1f2262-a5f6-44b0-a06d-222222222222",
    slug: "milsami-orhei-sheriff-tiraspol",
    title: "FC Milsami Orhei vs FC Sheriff Tiraspol",
    competitionName: "Cupa Moldovei",
    opponentName: "FC Sheriff Tiraspol",
    stadiumName: "Stadionul Municipal „Orhei”",
    city: "Orhei",
    description:
      "Meci eliminatoriu cu acces pe sectoare. Unele zone sunt rezervate pentru media și invitați.",
    posterUrl: null,
    bannerUrl: null,
    startsAt: "2026-05-18T17:30:00.000Z",
    status: "published",
    maxTicketsPerUser: 4,
    reservationOpensAt: "2026-05-05T08:00:00.000Z",
    reservationClosesAt: "2026-05-18T14:30:00.000Z",
    issuedCount: 92,
    scannedCount: 0,
    availableEstimate: 468,
    scannerEnabled: false,
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
    matchSlug: mockMatches[0].slug,
    ticketCode: "ORH-MIL-7Q4Z81",
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
    purchaserName: "Demo Supporter",
    purchaserEmail: "demo@example.com",
  },
];

export const mockAdminMatches: AdminMatchOverview[] = mockMatches.map((match) => ({
  id: match.id,
  slug: match.slug,
  title: match.title,
  competitionName: match.competitionName,
  opponentName: match.opponentName,
  stadiumName: match.stadiumName,
  startsAt: match.startsAt,
  status: match.status,
  scannerEnabled: match.scannerEnabled,
  maxTicketsPerUser: match.maxTicketsPerUser,
  issuedCount: match.issuedCount,
  scannedCount: match.scannedCount,
  noShowCount: Math.max(match.issuedCount - match.scannedCount, 0),
  duplicateScanAttempts: match.id === mockMatches[0].id ? 2 : 0,
}));

export const mockAdminUsers: AdminUserOverview[] = [
  {
    userId: "37c8fe91-d64a-436f-9df0-555555555555",
    email: "supporter.demo@example.com",
    fullName: "Andrei Munteanu",
    roles: ["user"],
    totalReserved: 6,
    totalScanned: 2,
    noShowRatio: 0.66,
    abuseScore: 58,
    activeBlockType: null,
    activeBlockUntil: null,
  },
  {
    userId: "824dd0d1-bb1c-441c-b5f6-666666666666",
    email: "steward.demo@example.com",
    fullName: "Irina Cebotari",
    roles: ["steward"],
    totalReserved: 0,
    totalScanned: 0,
    noShowRatio: 0,
    abuseScore: 0,
    activeBlockType: null,
    activeBlockUntil: null,
  },
];

export const mockScannerMatches: ScannerMatch[] = mockMatches.map((match) => ({
  id: match.id,
  title: match.title,
  opponentName: match.opponentName,
  startsAt: match.startsAt,
  scannerEnabled: match.scannerEnabled,
}));
