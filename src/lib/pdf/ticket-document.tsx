import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { TicketCard } from "@/lib/domain/types";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#fffaf0",
    padding: 28,
    fontSize: 11,
    color: "#08140f",
  },
  ticket: {
    borderWidth: 1,
    borderColor: "#d5a021",
    borderStyle: "solid",
    borderRadius: 16,
    padding: 18,
  },
  topBand: {
    backgroundColor: "#08140f",
    color: "#f8d376",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  section: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 8,
  },
  label: {
    color: "#516056",
    textTransform: "uppercase",
    fontSize: 9,
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
  },
  note: {
    marginTop: 12,
    color: "#516056",
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
          <View style={styles.topBand}>
            <Text>Stadionul Municipal „Orhei”</Text>
            <Text style={styles.title}>{ticket.matchTitle}</Text>
            <Text>{ticket.competitionName}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.row}>
              <Field label="Adversar" value={ticket.opponentName} />
              <Field label="Cod bilet" value={ticket.ticketCode} />
            </View>
            <View style={styles.row}>
              <Field label="Data și ora" value={new Date(ticket.startsAt).toLocaleString("ro-RO")} />
              <Field label="Stadion" value={ticket.stadiumName} />
            </View>
            <View style={styles.row}>
              <Field label="Sector" value={ticket.sectorName} />
              <Field label="Rând / loc" value={`${ticket.rowLabel} / ${ticket.seatNumber}`} />
            </View>
            <View style={styles.row}>
              <Field label="Poartă" value={ticket.gateName ?? "Fără poartă alocată"} />
              <Field label="Titular" value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"} />
            </View>
          </View>

          <Text style={styles.note}>
            Bilet gratuit, nominal, cu QR unic. La scanare validă statutul devine
            folosit și nu poate fi reutilizat.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

