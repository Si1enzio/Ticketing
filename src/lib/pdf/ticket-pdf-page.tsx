/* eslint-disable jsx-a11y/alt-text */
import path from "node:path";

import { Circle, Font, Image, Page, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

import type { StadiumSponsor, TicketCard } from "@/lib/domain/types";
import { brand } from "@/lib/brand";

const pdfFontFamily = "GeistPdf";
const geistPdfFontPath = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "compiled",
  "@vercel",
  "og",
  "Geist-Regular.ttf",
);

Font.register({
  family: pdfFontFamily,
  fonts: [
    { src: geistPdfFontPath, fontWeight: 400 },
    { src: geistPdfFontPath, fontWeight: 500 },
    { src: geistPdfFontPath, fontWeight: 600 },
    { src: geistPdfFontPath, fontWeight: 700 },
  ],
});

export const ticketPdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
    fontFamily: pdfFontFamily,
    fontSize: 9,
    color: "#111111",
  },
  ticket: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    minHeight: 252,
    maxHeight: 262,
  },
  band: {
    height: 6,
    backgroundColor: brand.colors.gold,
  },
  ticketLayout: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  mainColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  topPanel: {
    backgroundColor: brand.colors.navy,
    color: "#ffffff",
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 12,
    borderBottomRightRadius: 0,
  },
  eyebrow: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: brand.colors.goldSoft,
    marginBottom: 4,
  },
  pdfLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  pdfLogoIcon: {
    width: 34,
    height: 18,
  },
  pdfLogoTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pdfLogoTicket: {
    fontSize: 7.4,
    fontWeight: 700,
    letterSpacing: 1.8,
    color: "#ffffff",
  },
  pdfLogoHub: {
    fontSize: 7.4,
    fontWeight: 700,
    letterSpacing: 1.8,
    color: brand.colors.goldSoft,
  },
  title: {
    fontSize: 15,
    textTransform: "uppercase",
    lineHeight: 1.15,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 8,
    color: "#e5e7eb",
    marginTop: 5,
  },
  sponsorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  sponsorLabel: {
    fontSize: 6.6,
    color: brand.colors.goldSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sponsorBadge: {
    height: 18,
    minWidth: 44,
    maxWidth: 62,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    paddingTop: 3,
    paddingRight: 5,
    paddingBottom: 3,
    paddingLeft: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  sponsorLogo: {
    width: 48,
    height: 12,
    objectFit: "contain",
  },
  body: {
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 8,
    paddingLeft: 12,
  },
  qrColumn: {
    width: 190,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#ffffff",
    paddingTop: 22,
    paddingRight: 16,
    paddingBottom: 14,
    paddingLeft: 16,
  },
  qrBadge: {
    fontSize: 7.8,
    textTransform: "uppercase",
    color: brand.colors.navy,
    letterSpacing: 1.2,
    textAlign: "center",
    marginBottom: 14,
  },
  qrBody: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  qrCanvas: {
    width: "100%",
    minHeight: 154,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#d7dbe2",
    borderStyle: "solid",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  qrImage: {
    width: 146,
    height: 146,
    borderRadius: 0,
    backgroundColor: "#ffffff",
    padding: 0,
  },
  qrInfoBand: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  qrCaption: {
    fontSize: 6.9,
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: 600,
    textAlign: "center",
    color: "#111111",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
  },
  field: {
    width: "50%",
    paddingHorizontal: 3,
    marginBottom: 6,
  },
  fieldFull: {
    width: "100%",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    paddingTop: 7,
    paddingRight: 8,
    paddingBottom: 7,
    paddingLeft: 8,
    minHeight: 40,
  },
  cardPriority: {
    borderColor: brand.colors.goldSoft,
    backgroundColor: "#fffaf0",
  },
  label: {
    color: "#6b7280",
    textTransform: "uppercase",
    fontSize: 6.7,
    marginBottom: 3,
    letterSpacing: 1.1,
  },
  value: {
    fontSize: 9,
    lineHeight: 1.25,
  },
  valuePriority: {
    fontSize: 9.4,
    fontWeight: 600,
    color: brand.colors.navy,
  },
});

export function TicketHubPdfLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={ticketPdfStyles.pdfLogoRow}>
      <Svg viewBox="0 0 120 64" style={ticketPdfStyles.pdfLogoIcon}>
        <Rect x="0" y="4" width="54" height="56" fill={brand.colors.navy} />
        <Circle cx="0" cy="32" r="13" fill="#ffffff" />
        <Rect x="66" y="4" width="54" height="56" fill={brand.colors.gold} />
        <Circle cx="120" cy="32" r="13" fill="#ffffff" />
        <Circle cx="60" cy="32" r="20" fill="#ffffff" />
        <Circle cx="60" cy="32" r="10" fill={brand.colors.gold} />
      </Svg>
      {!compact ? (
        <View style={ticketPdfStyles.pdfLogoTextRow}>
          <Text style={ticketPdfStyles.pdfLogoTicket}>TICKET</Text>
          <Text style={ticketPdfStyles.pdfLogoHub}>HUB</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TicketPdfPage({
  ticket,
  qrDataUrl,
  sponsors = [],
}: {
  ticket: TicketCard;
  qrDataUrl: string;
  sponsors?: StadiumSponsor[];
}) {
  return (
    <Page size="A4" style={ticketPdfStyles.page}>
      <View style={ticketPdfStyles.ticket}>
        <View style={ticketPdfStyles.band} />
        <View style={ticketPdfStyles.ticketLayout}>
          <View style={ticketPdfStyles.mainColumn}>
            <View style={ticketPdfStyles.topPanel}>
              <TicketHubPdfLogo />
              <Text style={ticketPdfStyles.eyebrow}>{brand.operationalTagline}</Text>
              <Text style={ticketPdfStyles.title}>{ticket.matchTitle}</Text>
              <Text style={ticketPdfStyles.subtitle}>{ticket.competitionName}</Text>
              {sponsors.length ? (
                <View style={ticketPdfStyles.sponsorRow}>
                  <Text style={ticketPdfStyles.sponsorLabel}>Sponsori organizator</Text>
                  {sponsors.slice(0, 4).map((sponsor) => (
                    <View key={sponsor.id} style={ticketPdfStyles.sponsorBadge}>
                      <Image src={sponsor.logoUrl} style={ticketPdfStyles.sponsorLogo} />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={ticketPdfStyles.body}>
              <View style={ticketPdfStyles.grid}>
                <TicketField
                  label="Titular"
                  value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"}
                />
                <TicketField
                  label="Data si ora"
                  value={new Date(ticket.startsAt).toLocaleString("ro-RO")}
                />
                <TicketField label="Sector" value={ticket.sectorName} />
                <TicketField label="Poarta" value={ticket.gateName ?? "Fara poarta alocata"} />
                <TicketField label="Rand" value={ticket.rowLabel} />
                <TicketField label="Loc" value={String(ticket.seatNumber)} />
              </View>
            </View>
          </View>

          <View style={ticketPdfStyles.qrColumn}>
            <Text style={ticketPdfStyles.qrBadge}>QR unic de acces</Text>
            <View style={ticketPdfStyles.qrBody}>
              <View style={ticketPdfStyles.qrCanvas}>
                <Image src={qrDataUrl} style={ticketPdfStyles.qrImage} />
              </View>
              <View style={ticketPdfStyles.qrInfoBand}>
                <Text style={ticketPdfStyles.qrCaption}>Cod bilet</Text>
                <Text style={ticketPdfStyles.qrCodeText}>{ticket.ticketCode}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
}

function TicketField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  const isPriority =
    label === "Sector" || label === "Rand" || label === "Loc" || label === "Poarta";

  return (
    <View
      style={fullWidth ? [ticketPdfStyles.field, ticketPdfStyles.fieldFull] : ticketPdfStyles.field}
    >
      <View style={isPriority ? [ticketPdfStyles.card, ticketPdfStyles.cardPriority] : ticketPdfStyles.card}>
        <Text style={ticketPdfStyles.label}>{label}</Text>
        <Text
          style={
            isPriority
              ? [ticketPdfStyles.value, ticketPdfStyles.valuePriority]
              : ticketPdfStyles.value
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
