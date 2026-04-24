/* eslint-disable jsx-a11y/alt-text */
import path from "node:path";

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { brand } from "@/lib/brand";
import type { UserSubscription } from "@/lib/domain/types";
import { formatSeatPosition } from "@/lib/format/seat";
import { TicketHubPdfLogo } from "@/lib/pdf/ticket-pdf-page";

const pdfFontFamily = "GeistSubscriptionPdf";
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

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 24,
    fontFamily: pdfFontFamily,
    color: "#111111",
  },
  shell: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  band: {
    height: 8,
    backgroundColor: brand.colors.gold,
  },
  body: {
    padding: 20,
    gap: 18,
  },
  heading: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 2.2,
    color: brand.colors.navy,
  },
  title: {
    fontSize: 30,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    color: "#4b5563",
  },
  qrSection: {
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: brand.colors.goldSoft,
    borderStyle: "solid",
    borderRadius: 18,
    backgroundColor: "#fffaf0",
    padding: 18,
  },
  qrTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: brand.colors.navy,
  },
  qrImage: {
    width: 220,
    height: 220,
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 18,
  },
  codeLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: 1.4,
  },
  codeValue: {
    fontSize: 24,
    fontWeight: 700,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  field: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  fieldCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 14,
    backgroundColor: "#fafafa",
    minHeight: 58,
    padding: 10,
  },
  fieldLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#6b7280",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 12,
    lineHeight: 1.35,
  },
  note: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
  },
});

export function SubscriptionDocument({
  subscription,
  qrDataUrl,
}: {
  subscription: UserSubscription;
  qrDataUrl: string;
}) {
  const holderBirthDate = subscription.holderBirthDate
    ? new Date(subscription.holderBirthDate).toLocaleDateString("ro-RO")
    : "Nedeclarata";

  return (
    <Document
      title={`Abonament ${subscription.subscriptionCode}`}
      author={brand.displayName}
      subject={subscription.product.name}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.shell}>
          <View style={styles.band} />
          <View style={styles.body}>
            <View style={styles.heading}>
              <TicketHubPdfLogo compact />
              <Text style={styles.eyebrow}>Abonament evenimente</Text>
              <Text style={styles.title}>{subscription.product.name}</Text>
              <Text style={styles.subtitle}>
                Valabil pentru toate meciurile de pe stadionul {subscription.stadiumName}
              </Text>
            </View>

            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>QR unic de acces</Text>
              <Image src={qrDataUrl} style={styles.qrImage} />
              <Text style={styles.codeLabel}>Cod abonament</Text>
              <Text style={styles.codeValue}>{subscription.subscriptionCode}</Text>
            </View>

            <View style={styles.grid}>
              <SubscriptionField label="Titular" value={subscription.holderName ?? "Abonat"} />
              <SubscriptionField label="Email" value={subscription.holderEmail ?? "Nedeclarat"} />
              <SubscriptionField label="Data nasterii" value={holderBirthDate} />
              <SubscriptionField
                label="Valabilitate"
                value={`${new Date(subscription.startsAt).toLocaleDateString("ro-RO")} - ${new Date(subscription.endsAt).toLocaleDateString("ro-RO")}`}
              />
              <SubscriptionField label="Stadion" value={subscription.stadiumName ?? "Nedefinit"} />
              <SubscriptionField label="Poarta" value={subscription.gateName ?? "Libera"} />
              <SubscriptionField label="Sector" value={subscription.sectorName ?? "Fara sector"} />
              <SubscriptionField
                label="Pozitie loc"
                value={formatSeatPosition(subscription)}
              />
            </View>

            <Text style={styles.note}>
              Acest abonament permite o singura intrare la fiecare meci din perioada de
              valabilitate. La scanare pot fi afisate stewardului numele si data de nastere
              pentru validare suplimentara.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function SubscriptionField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldCard}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    </View>
  );
}
