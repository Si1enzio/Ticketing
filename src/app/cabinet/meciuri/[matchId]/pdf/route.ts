import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { TicketGroupDocument } from "@/lib/pdf/ticket-group-document";
import { getTicketGroupFilenamePrefix, getTicketGroupPdfOptions } from "@/lib/pdf/ticket-group-options";
import { withNoStoreHeaders } from "@/lib/security/http";
import { generateTicketQrDataUrl } from "@/lib/security/tickets";
import {
  getStadiumSponsors,
  getViewerContext,
  getViewerTickets,
} from "@/lib/supabase/queries";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/cabinet/meciuri/[matchId]/pdf">,
) {
  const { matchId } = await context.params;
  const viewer = await getViewerContext();

  if (!viewer.userId) {
    return new Response("Autentificare necesara.", { status: 401 });
  }

  const tickets = (await getViewerTickets(viewer))
    .filter((ticket) => ticket.matchId === matchId)
    .sort((a, b) => a.sectorCode.localeCompare(b.sectorCode) || a.rowLabel.localeCompare(b.rowLabel) || a.seatNumber - b.seatNumber);

  if (!tickets.length) {
    return new Response("Nu exista bilete pentru acest meci.", { status: 404 });
  }

  const qrDataUrls = await Promise.all(
    tickets.map((ticket) =>
      generateTicketQrDataUrl({
        code: ticket.ticketCode,
        matchId: ticket.matchId,
        version: ticket.qrTokenVersion,
        kind: "ticket",
      }),
    ),
  );
  const sponsors = await getStadiumSponsors(tickets[0].stadiumId);
  const url = new URL(request.url);
  const pdfOptions = getTicketGroupPdfOptions(url);
  const buffer = await renderToBuffer(
    TicketGroupDocument({ tickets, qrDataUrls, sponsors, ...pdfOptions }),
  );
  const shouldDownload = url.searchParams.get("download") === "1";
  const prefix = getTicketGroupFilenamePrefix(pdfOptions);

  return new Response(new Uint8Array(buffer), {
    headers: {
      ...Object.fromEntries(withNoStoreHeaders()),
      "Content-Type": "application/pdf",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${prefix}-${tickets[0].matchSlug}.pdf"`,
    },
  });
}
