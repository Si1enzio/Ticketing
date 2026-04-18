import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { TicketCard } from "@/lib/domain/types";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f7f7f8",
    padding: 28,
    fontSize: 11,
    color: "#111111",
  },
  ticket: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  band: {
    height: 8,
    backgroundColor: "#dc2626",
  },
  topPanel: {
    backgroundColor: "#111111",
    color: "#ffffff",
    padding: 20,
  },
  eyebrow: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#fecaca",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  subtitle: {
    color: "#d4d4d8",
  },
  body: {
    padding: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  field: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 14,
    backgroundColor: "#fafafa",
    padding: 12,
    minHeight: 58,
  },
  label: {
    color: "#6b7280",
    textTransform: "uppercase",
    fontSize: 8,
    marginBottom: 4,
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 11,
    lineHeight: 1.45,
  },
  noteWrap: {
    borderWidth: 1,
    borderColor: "#fee2e2",
    borderStyle: "solid",
    borderRadius: 14,
    backgroundColor: "#fff1f2",
    padding: 12,
    marginTop: 6,
  },
  note: {
    color: "#7f1d1d",
    lineHeight: 1.5,
  },
});

export function TicketDocument({ ticket }: { ticket: TicketCard }) {
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
            <View style={styles.grid}>
              <Field label="Adversar" value={ticket.opponentName} />
              <Field label="Cod bilet" value={ticket.ticketCode} />
              <Field
                label="Data si ora"
                value={new Date(ticket.startsAt).toLocaleString("ro-RO")}
              />
              <Field label="Stadion" value={ticket.stadiumName} />
              <Field label="Sector" value={ticket.sectorName} />
              <Field label="Rand / loc" value={`${ticket.rowLabel} / ${ticket.seatNumber}`} />
              <Field label="Poarta" value={ticket.gateName ?? "Fara poarta alocata"} />
              <Field
                label="Titular"
                value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"}
              />
            </View>

            <View style={styles.noteWrap}>
              <Text style={styles.note}>
                Bilet gratuit, nominal, cu QR unic. Dupa o scanare valida, statutul devine
                folosit si accesul nu mai poate fi repetat.
              </Text>
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
