import { renderToBuffer } from "@react-pdf/renderer";

import { TicketDocument } from "@/lib/pdf/ticket-document";
import { generateTicketQrDataUrl } from "@/lib/security/tickets";
import { getTicketByCode, getViewerContext } from "@/lib/supabase/queries";

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

  const url = new URL(request.url);
  const shouldDownload = url.searchParams.get("download") === "1";
  const buffer = await renderToBuffer(TicketDocument({ ticket, qrDataUrl }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${ticket.ticketCode}.pdf"`,
    },
  });
}
