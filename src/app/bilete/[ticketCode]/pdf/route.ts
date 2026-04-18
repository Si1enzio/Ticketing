import { renderToBuffer } from "@react-pdf/renderer";

import { TicketDocument } from "@/lib/pdf/ticket-document";
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

  const buffer = await renderToBuffer(TicketDocument({ ticket }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ticket.ticketCode}.pdf"`,
    },
  });
}
