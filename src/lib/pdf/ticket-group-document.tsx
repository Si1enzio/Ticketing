import { Document } from "@react-pdf/renderer";

import type { StadiumSponsor, TicketCard } from "@/lib/domain/types";
import { TicketPdfPage } from "@/lib/pdf/ticket-pdf-page";

export function TicketGroupDocument({
  tickets,
  qrDataUrls,
  sponsors = [],
}: {
  tickets: TicketCard[];
  qrDataUrls: string[];
  sponsors?: StadiumSponsor[];
}) {
  return (
    <Document
      title={`Bilete grupate ${tickets[0]?.matchTitle ?? "Meci"}`}
      author="Milsami Ticketing"
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
