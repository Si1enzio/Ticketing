/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { StadiumSponsor, TicketCard } from "@/lib/domain/types";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
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
    minHeight: 262,
    maxHeight: 272,
  },
  band: {
    height: 6,
    backgroundColor: "#dc2626",
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
    backgroundColor: "#111111",
    color: "#ffffff",
    paddingTop: 9,
    paddingRight: 12,
    paddingBottom: 11,
    paddingLeft: 12,
  },
  eyebrow: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: "#fecaca",
    marginBottom: 4,
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
    marginTop: 7,
  },
  sponsorLabel: {
    fontSize: 6.6,
    color: "#fecaca",
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
    paddingBottom: 10,
    paddingLeft: 12,
  },
  qrColumn: {
    width: 198,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderStyle: "solid",
    borderRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  qrTopPanel: {
    width: "100%",
    backgroundColor: "#111111",
    paddingTop: 11,
    paddingRight: 10,
    paddingBottom: 12,
    paddingLeft: 10,
    minHeight: 84,
    justifyContent: "center",
  },
  qrBadge: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#fecaca",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  qrBody: {
    width: "100%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
  },
  qrCanvas: {
    width: "100%",
    flexGrow: 1,
    minHeight: 156,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.4,
    borderColor: "#f87171",
    borderStyle: "solid",
    borderRadius: 12,
    backgroundColor: "#fff5f5",
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
  },
  qrImage: {
    width: 146,
    height: 146,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    backgroundColor: "#ffffff",
    padding: 10,
  },
  qrInfoBand: {
    width: "100%",
    borderWidth: 1.2,
    borderColor: "#fca5a5",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingTop: 7,
    paddingRight: 8,
    paddingBottom: 7,
    paddingLeft: 8,
    alignItems: "center",
    marginTop: 10,
  },
  qrCaption: {
    fontSize: 6.8,
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  qrCodeText: {
    fontSize: 14,
    fontWeight: 600,
    textAlign: "center",
    color: "#111111",
  },
  qrHelper: {
    marginTop: 7,
    fontSize: 6.9,
    lineHeight: 1.3,
    color: "#7f1d1d",
    textAlign: "center",
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
    minHeight: 42,
  },
  cardPriority: {
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
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
    color: "#111111",
  },
});

export function TicketDocument({
  ticket,
  qrDataUrl,
  sponsors = [],
}: {
  ticket: TicketCard;
  qrDataUrl: string;
  sponsors?: StadiumSponsor[];
}) {
  return (
    <Document
      title={`Bilet ${ticket.ticketCode}`}
      author="Milsami Ticketing"
      subject={ticket.matchTitle}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.ticket}>
          <View style={styles.band} />
          <View style={styles.ticketLayout}>
            <View style={styles.mainColumn}>
              <View style={styles.topPanel}>
                <Text style={styles.eyebrow}>Stadionul Municipal Orhei</Text>
                <Text style={styles.title}>{ticket.matchTitle}</Text>
                <Text style={styles.subtitle}>{ticket.competitionName}</Text>
                {sponsors.length ? (
                  <View style={styles.sponsorRow}>
                    <Text style={styles.sponsorLabel}>Sponsori club gazda</Text>
                    {sponsors.slice(0, 4).map((sponsor) => (
                      <View key={sponsor.id} style={styles.sponsorBadge}>
                        <Image src={sponsor.logoUrl} style={styles.sponsorLogo} />
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <View style={styles.body}>
                <View style={styles.grid}>
                  <Field label="Sector" value={ticket.sectorName} />
                  <Field label="Rand" value={ticket.rowLabel} />
                  <Field label="Loc" value={String(ticket.seatNumber)} />
                  <Field label="Poarta" value={ticket.gateName ?? "Fara poarta alocata"} />
                  <Field
                    label="Titular"
                    value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"}
                  />
                  <Field
                    label="Data si ora"
                    value={new Date(ticket.startsAt).toLocaleString("ro-RO")}
                  />
                  <Field fullWidth label="Stadion" value={ticket.stadiumName} />
                </View>
              </View>
            </View>

            <View style={styles.qrColumn}>
              <View style={styles.qrTopPanel}>
                <Text style={styles.qrBadge}>QR unic de acces</Text>
              </View>
              <View style={styles.qrBody}>
                <View style={styles.qrCanvas}>
                  <Image src={qrDataUrl} style={styles.qrImage} />
                </View>
                <View style={styles.qrInfoBand}>
                  <Text style={styles.qrCaption}>Cod bilet</Text>
                  <Text style={styles.qrCodeText}>{ticket.ticketCode}</Text>
                </View>
                <Text style={styles.qrHelper}>
                  Prezentati acest cod la acces. Valabil pentru o singura intrare.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function Field({
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
    <View style={fullWidth ? [styles.field, styles.fieldFull] : styles.field}>
      <View style={isPriority ? [styles.card, styles.cardPriority] : styles.card}>
        <Text style={styles.label}>{label}</Text>
        <Text style={isPriority ? [styles.value, styles.valuePriority] : styles.value}>
          {value}
        </Text>
      </View>
    </View>
  );
}
