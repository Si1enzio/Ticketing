/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { StadiumSponsor, TicketCard } from "@/lib/domain/types";
import { brand } from "@/lib/brand";
import { TicketHubPdfLogo, TicketPdfPage } from "@/lib/pdf/ticket-pdf-page";

export type TicketGroupLayout = "full-page" | "cut-sheet";
export type TicketsPerSheet = 3 | 4 | 6;

const sheetLayouts: Record<TicketsPerSheet, { columns: number; rows: number; qrSize: number }> = {
  3: { columns: 1, rows: 3, qrSize: 132 },
  4: { columns: 2, rows: 2, qrSize: 112 },
  6: { columns: 2, rows: 3, qrSize: 92 },
};

const sheetStyles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    fontFamily: "GeistPdf",
    color: "#111111",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    height: "100%",
  },
  cell: {
    paddingTop: 7,
    paddingRight: 7,
    paddingBottom: 7,
    paddingLeft: 7,
    borderColor: "#d4d4d4",
    borderStyle: "dashed",
    borderWidth: 0.7,
  },
  ticket: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.colors.goldSoft,
    borderStyle: "solid",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  ticketInner: {
    flexDirection: "row",
    flexGrow: 1,
    minHeight: "100%",
  },
  details: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  header: {
    backgroundColor: brand.colors.navy,
    color: "#ffffff",
    paddingTop: 8,
    paddingRight: 9,
    paddingBottom: 8,
    paddingLeft: 9,
    borderTopWidth: 5,
    borderTopColor: brand.colors.gold,
    borderTopStyle: "solid",
  },
  stadium: {
    fontSize: 6.8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: brand.colors.goldSoft,
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    lineHeight: 1.15,
    textTransform: "uppercase",
  },
  competition: {
    marginTop: 3,
    fontSize: 6.8,
    color: "#e5e7eb",
  },
  sponsors: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sponsorLabel: {
    fontSize: 5.8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: brand.colors.goldSoft,
  },
  sponsorBadge: {
    width: 36,
    height: 16,
    borderRadius: 7,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  sponsorLogo: {
    width: 31,
    height: 8,
    objectFit: "contain",
  },
  sponsorName: {
    marginTop: 1,
    fontSize: 3.6,
    color: brand.colors.navy,
    textAlign: "center",
  },
  fields: {
    paddingTop: 7,
    paddingRight: 8,
    paddingBottom: 7,
    paddingLeft: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -2,
  },
  field: {
    width: "50%",
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  fieldCard: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: brand.colors.goldSoft,
    borderStyle: "solid",
    borderRadius: 8,
    backgroundColor: "#fffaf0",
    paddingTop: 5,
    paddingRight: 6,
    paddingBottom: 5,
    paddingLeft: 6,
  },
  label: {
    fontSize: 5.6,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 2,
  },
  value: {
    fontSize: 8.2,
    lineHeight: 1.15,
    fontWeight: 600,
  },
  qrColumn: {
    width: 142,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: brand.colors.goldSoft,
    borderLeftStyle: "solid",
  },
  qrTitle: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: brand.colors.navy,
    textAlign: "center",
    marginBottom: 5,
  },
  qrFrame: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#d7dbe2",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 7,
  },
  qrImage: {
    backgroundColor: "#ffffff",
  },
  codeLabel: {
    marginTop: 7,
    fontSize: 6,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6b7280",
    textAlign: "center",
  },
  code: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
  },
});

export function TicketGroupDocument({
  tickets,
  qrDataUrls,
  sponsors = [],
  layout = "full-page",
  ticketsPerSheet = 6,
}: {
  tickets: TicketCard[];
  qrDataUrls: string[];
  sponsors?: StadiumSponsor[];
  layout?: TicketGroupLayout;
  ticketsPerSheet?: TicketsPerSheet;
}) {
  if (layout === "cut-sheet") {
    return (
      <Document
        title={`Bundle print ${tickets[0]?.matchTitle ?? "Eveniment"}`}
        author={brand.displayName}
        subject={tickets[0]?.matchTitle ?? "Bundle print"}
      >
        {chunkTickets(tickets, qrDataUrls, ticketsPerSheet).map((chunk, pageIndex) => (
          <TicketCutSheetPage
            key={`${ticketsPerSheet}-${pageIndex}`}
            items={chunk}
            sponsors={sponsors}
            ticketsPerSheet={ticketsPerSheet}
          />
        ))}
      </Document>
    );
  }

  return (
    <Document
      title={`Bilete grupate ${tickets[0]?.matchTitle ?? "Eveniment"}`}
      author={brand.displayName}
      subject={tickets[0]?.matchTitle ?? "Bilete grupate"}
    >
      {tickets.map((ticket, index) => (
        <TicketPdfPage
          key={ticket.ticketId}
          ticket={ticket}
          qrDataUrl={qrDataUrls[index] ?? qrDataUrls[0] ?? ""}
          sponsors={sponsors}
        />
      ))}
    </Document>
  );
}

function TicketCutSheetPage({
  items,
  sponsors,
  ticketsPerSheet,
}: {
  items: Array<{ ticket: TicketCard; qrDataUrl: string }>;
  sponsors: StadiumSponsor[];
  ticketsPerSheet: TicketsPerSheet;
}) {
  const layout = sheetLayouts[ticketsPerSheet];
  const cellWidth = `${100 / layout.columns}%`;
  const cellHeight = `${100 / layout.rows}%`;

  return (
    <Page size="A4" style={sheetStyles.page}>
      <View style={sheetStyles.grid}>
        {Array.from({ length: ticketsPerSheet }).map((_, index) => {
          const item = items[index];

          return (
            <View key={item?.ticket.ticketId ?? `empty-${index}`} style={[sheetStyles.cell, { width: cellWidth, height: cellHeight }]}>
              {item ? (
                <CompactTicketCard
                  ticket={item.ticket}
                  qrDataUrl={item.qrDataUrl}
                  qrSize={layout.qrSize}
                  sponsors={sponsors}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </Page>
  );
}

function CompactTicketCard({
  ticket,
  qrDataUrl,
  qrSize,
  sponsors,
}: {
  ticket: TicketCard;
  qrDataUrl: string;
  qrSize: number;
  sponsors: StadiumSponsor[];
}) {
  return (
    <View style={sheetStyles.ticket}>
      <View style={sheetStyles.ticketInner}>
        <View style={sheetStyles.details}>
          <View style={sheetStyles.header}>
            <TicketHubPdfLogo compact />
            <Text style={sheetStyles.stadium}>{ticket.stadiumName}</Text>
            <Text style={sheetStyles.title}>{ticket.matchTitle}</Text>
            <Text style={sheetStyles.competition}>{ticket.competitionName}</Text>
            {sponsors.length ? (
              <View style={sheetStyles.sponsors}>
                <Text style={sheetStyles.sponsorLabel}>Sponsori</Text>
                {sponsors.slice(0, 2).map((sponsor) => (
                  <View key={sponsor.id} style={sheetStyles.sponsorBadge}>
                    <Image src={sponsor.logoUrl} style={sheetStyles.sponsorLogo} />
                    <Text style={sheetStyles.sponsorName}>{sponsor.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={sheetStyles.fields}>
            <CompactField label="Titular" value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"} />
            <CompactField label="Data si ora" value={formatDate(ticket.startsAt)} />
            <CompactField label="Sector" value={ticket.sectorName} />
            <CompactField label="Poarta" value={ticket.gateName ?? "Fara poarta"} />
            <CompactField label="Rand" value={ticket.rowLabel} />
            <CompactField label="Loc" value={String(ticket.seatNumber)} />
          </View>
        </View>

        <View style={sheetStyles.qrColumn}>
          <Text style={sheetStyles.qrTitle}>QR unic de acces</Text>
          <View style={sheetStyles.qrFrame}>
            <Image src={qrDataUrl} style={[sheetStyles.qrImage, { width: qrSize, height: qrSize }]} />
          </View>
          <Text style={sheetStyles.codeLabel}>Cod bilet</Text>
          <Text style={sheetStyles.code}>{ticket.ticketCode}</Text>
        </View>
      </View>
    </View>
  );
}

function CompactField({ label, value }: { label: string; value: string }) {
  return (
    <View style={sheetStyles.field}>
      <View style={sheetStyles.fieldCard}>
        <Text style={sheetStyles.label}>{label}</Text>
        <Text style={sheetStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function chunkTickets(tickets: TicketCard[], qrDataUrls: string[], size: TicketsPerSheet) {
  const chunks: Array<Array<{ ticket: TicketCard; qrDataUrl: string }>> = [];

  for (let index = 0; index < tickets.length; index += size) {
    chunks.push(
      tickets.slice(index, index + size).map((ticket, offset) => ({
        ticket,
        qrDataUrl: qrDataUrls[index + offset] ?? qrDataUrls[0] ?? "",
      })),
    );
  }

  return chunks;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
