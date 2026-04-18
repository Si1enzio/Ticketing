import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckCircle2, Download, QrCode, Ticket } from "lucide-react";

import { TicketListItem } from "@/components/ticket-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTicketsByReservationId, getViewerContext } from "@/lib/supabase/queries";

export default async function ReservationConfirmationPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  await connection();
  const { reservationId } = await params;
  const viewer = await getViewerContext();
  const tickets = await getTicketsByReservationId(reservationId, viewer);

  if (!tickets.length) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="surface-dark overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.26),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardContent className="space-y-5 p-8">
          <div className="flex items-center gap-3 text-[#fecaca]">
            <CheckCircle2 className="h-7 w-7" />
            <span className="text-sm uppercase tracking-[0.28em]">Emitere confirmata</span>
          </div>
          <div>
            <h1 className="font-heading text-5xl uppercase tracking-[0.08em]">
              Biletele sunt gata
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Fiecare loc selectat a primit un bilet cu QR unic. Le poti deschide
              individual, descarca in PDF sau afisa direct la poarta.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              <Link href={`/bilete/${tickets[0].ticketCode}`}>
                <QrCode className="mr-2 h-4 w-4" />
                Deschide primul bilet
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-full bg-white text-[#111111] hover:bg-neutral-100"
            >
              <Link href={`/bilete/${tickets[0].ticketCode}/pdf`} target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Descarca PDF
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/12 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/cabinet">
                <Ticket className="mr-2 h-4 w-4" />
                Mergi in cabinet
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <TicketListItem key={ticket.ticketId} ticket={ticket} />
        ))}
      </div>
    </section>
  );
}
