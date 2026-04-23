import type { TicketGroupLayout, TicketsPerSheet } from "@/lib/pdf/ticket-group-document";

const supportedSheets = [3, 4, 6] as const;

export function getTicketGroupPdfOptions(url: URL): {
  layout: TicketGroupLayout;
  ticketsPerSheet: TicketsPerSheet;
} {
  const rawPerPage = Number(url.searchParams.get("perPage"));
  const requestedSheet = supportedSheets.find((value) => value === rawPerPage);
  const isCutSheet = url.searchParams.get("layout") === "cut-sheet" || Boolean(requestedSheet);

  return {
    layout: isCutSheet ? "cut-sheet" : "full-page",
    ticketsPerSheet: requestedSheet ?? 6,
  };
}

export function getTicketGroupFilenamePrefix(options: {
  layout: TicketGroupLayout;
  ticketsPerSheet: TicketsPerSheet;
}) {
  return options.layout === "cut-sheet" ? `print-a4-${options.ticketsPerSheet}` : "bundle";
}
