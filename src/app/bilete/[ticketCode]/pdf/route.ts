import { renderToBuffer } from "@react-pdf/renderer";

import { TicketDocument } from "@/lib/pdf/ticket-document";
import { withNoStoreHeaders } from "@/lib/security/http";
import { generateTicketQrDataUrl } from "@/lib/security/tickets";
import {
  getStadiumSponsors,
  getTicketByCode,
  getViewerContext,
} from "@/lib/supabase/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ ticketCode: string }> },
) {
  const { ticketCode } = await context.params;
  const viewer = await getViewerContext();
  const ticket = await getTicketByCode(ticketCode, viewer);

  if (!ticket) {
    return new Response("Bilet inexistent.", { status: 404 });
  }

  const qrDataUrl = await generateTicketQrDataUrl({
    code: ticket.ticketCode,
    matchId: ticket.matchId,
    version: ticket.qrTokenVersion,
    kind: "ticket",
  });
  const sponsors = await getStadiumSponsors(ticket.stadiumId);

  const url = new URL(request.url);
  const shouldDownload = url.searchParams.get("download") === "1";
  const buffer = await renderToBuffer(TicketDocument({ ticket, qrDataUrl, sponsors }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      ...Object.fromEntries(withNoStoreHeaders()),
      "Content-Type": "application/pdf",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${ticket.ticketCode}.pdf"`,
    },
  });
}
