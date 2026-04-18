import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Download, QrCode } from "lucide-react";

import { TicketListItem } from "@/components/ticket-list-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTicketsByReservationId, getViewerContext } from "@/lib/supabase/queries";

export default async function ReservationConfirmationPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  const viewer = await getViewerContext();
  const tickets = await getTicketsByReservationId(reservationId, viewer);

  if (!tickets.length) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-[#d5a021]/20 bg-[#08140f] text-white">
        <div className="h-2 bg-gradient-to-r from-[#11552d] via-[#d5a021] to-[#11552d]" />
        <CardContent className="space-y-5 p-8">
          <div className="flex items-center gap-3 text-[#f8d376]">
            <CheckCircle2 className="h-7 w-7" />
            <span className="text-sm uppercase tracking-[0.28em]">
              Rezervare confirmată
            </span>
          </div>
          <div>
            <h1 className="font-heading text-5xl uppercase tracking-[0.12em]">
              Biletele sunt gata
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Fiecare loc a primit un bilet cu QR unic. Le poți deschide individual,
              descărca în PDF sau afișa direct la poartă.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-full bg-[#d5a021] text-[#08140f] hover:bg-[#f0bd44]">
              <Link href={`/bilete/${tickets[0].ticketCode}`}>
                <QrCode className="mr-2 h-4 w-4" />
                Deschide primul bilet
              </Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-full bg-white text-[#08140f] hover:bg-white/90">
              <Link href={`/bilete/${tickets[0].ticketCode}/pdf`} target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Descarcă PDF
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
