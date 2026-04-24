import { Document } from "@react-pdf/renderer";

import { brand } from "@/lib/brand";
import type { StadiumSponsor, TicketCard } from "@/lib/domain/types";
import { TicketPdfPage } from "@/lib/pdf/ticket-pdf-page";

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
      author={brand.displayName}
      subject={ticket.matchTitle}
    >
      <TicketPdfPage ticket={ticket} qrDataUrl={qrDataUrl} sponsors={sponsors} />
    </Document>
  );
}
