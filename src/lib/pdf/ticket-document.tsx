/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { TicketCard } from "@/lib/domain/types";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f4f4f5",
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
    minHeight: 238,
    maxHeight: 250,
  },
  band: {
    height: 6,
    backgroundColor: "#dc2626",
  },
  topPanel: {
    backgroundColor: "#111111",
    color: "#ffffff",
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 10,
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
    fontSize: 16,
    textTransform: "uppercase",
    lineHeight: 1.15,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 8.5,
    color: "#e5e7eb",
  },
  body: {
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 12,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailsColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  qrColumn: {
    width: 116,
    alignItems: "center",
    paddingTop: 2,
  },
  qrBadge: {
    fontSize: 7.5,
    textTransform: "uppercase",
    color: "#7f1d1d",
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  qrImage: {
    width: 86,
    height: 86,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    backgroundColor: "#ffffff",
    padding: 4,
    marginBottom: 5,
  },
  qrCaption: {
    fontSize: 6.8,
    color: "#6b7280",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  qrCodeText: {
    fontSize: 11,
    fontWeight: 600,
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
  noteWrap: {
    borderWidth: 1,
    borderColor: "#fee2e2",
    borderStyle: "solid",
    borderRadius: 10,
    backgroundColor: "#fff1f2",
    paddingTop: 7,
    paddingRight: 8,
    paddingBottom: 7,
    paddingLeft: 8,
    marginTop: 2,
  },
  note: {
    color: "#7f1d1d",
    fontSize: 8,
    lineHeight: 1.35,
  },
});

export function TicketDocument({
  ticket,
  qrDataUrl,
}: {
  ticket: TicketCard;
  qrDataUrl: string;
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
          <View style={styles.topPanel}>
            <Text style={styles.eyebrow}>Stadionul Municipal Orhei</Text>
            <Text style={styles.title}>{ticket.matchTitle}</Text>
            <Text style={styles.subtitle}>{ticket.competitionName}</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.contentRow}>
              <View style={styles.detailsColumn}>
                <View style={styles.grid}>
                  <Field label="Adversar" value={ticket.opponentName} />
                  <Field label="Cod bilet" value={ticket.ticketCode} />
                  <Field
                    label="Data si ora"
                    value={new Date(ticket.startsAt).toLocaleString("ro-RO")}
                  />
                  <Field label="Stadion" value={ticket.stadiumName} />
                  <Field label="Sector" value={ticket.sectorName} />
                  <Field
                    label="Rand / loc"
                    value={`${ticket.rowLabel} / ${ticket.seatNumber}`}
                  />
                  <Field label="Poarta" value={ticket.gateName ?? "Fara poarta alocata"} />
                  <Field
                    label="Titular"
                    value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"}
                  />
                </View>

                <View style={styles.noteWrap}>
                  <Text style={styles.note}>
                    Bilet nominal cu QR unic. Dupa o scanare valida, accesul nu mai poate fi
                    repetat.
                  </Text>
                </View>
              </View>

              <View style={styles.qrColumn}>
                <Text style={styles.qrBadge}>QR unic de acces</Text>
                <Image src={qrDataUrl} style={styles.qrImage} />
                <Text style={styles.qrCaption}>Cod bilet</Text>
                <Text style={styles.qrCodeText}>{ticket.ticketCode}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}
