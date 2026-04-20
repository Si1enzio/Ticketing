import { notFound } from "next/navigation";
import { connection } from "next/server";

import { SeatMapBoard } from "@/components/seat-map-board";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getPublicMatchBySlug,
  getSeatMapForMatch,
  getViewerContext,
  getViewerTickets,
} from "@/lib/supabase/queries";

export default async function ReserveSeatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const viewer = await getViewerContext();
  const match = await getPublicMatchBySlug(slug);

  if (!match) {
    notFound();
  }

  const [sectors, tickets] = await Promise.all([
    getSeatMapForMatch(match.id, viewer),
    getViewerTickets(viewer),
  ]);

  const activeTicketsForMatch = tickets.filter(
    (ticket) => ticket.matchId === match.id && ticket.status !== "canceled",
  ).length;

  const remainingLimit = viewer.isPrivileged
    ? null
    : Math.max(match.maxTicketsPerUser - activeTicketsForMatch, 0);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          {match.ticketingMode === "paid" ? "Procurare bilete" : "Emitere bilete gratuite"}
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          {match.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
          {match.ticketingMode === "paid"
            ? "Acest meci foloseste checkout demo pentru procurare. Fluxul blocheaza locurile, confirma plata si emite instant biletele cu QR."
            : "Acest meci foloseste emitere gratuita. Locurile se blocheaza doar temporar, pentru cateva minute, cat timp confirmi emiterea biletelor."}
        </p>
      </div>

      {viewer.reservationBlockedUntil ? (
        <Alert className="border-red-200 bg-red-50">
          <AlertTitle>Cont restrictionat temporar</AlertTitle>
          <AlertDescription>
            Solicitarea biletelor este blocata pana la{" "}
            {new Date(viewer.reservationBlockedUntil).toLocaleString("ro-RO")}.
          </AlertDescription>
        </Alert>
      ) : null}

      <SeatMapBoard
        matchId={match.id}
        matchSlug={match.slug}
        matchTitle={match.title}
        stadiumId={match.stadiumId}
        stadiumName={match.stadiumName}
        sectors={sectors}
        viewer={viewer}
        remainingLimit={remainingLimit}
        ticketingMode={match.ticketingMode}
        ticketPriceCents={match.ticketPriceCents}
        currency={match.currency}
      />
    </section>
  );
}
