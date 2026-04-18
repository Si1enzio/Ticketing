import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { BadgeCheck, DownloadCloud } from "lucide-react";

import { cancelTicketAction, reissueTicketAction } from "@/lib/actions/admin";
import { ShareActions } from "@/components/share-actions";
import { TicketQr } from "@/components/ticket-qr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/lib/env";
import { getTicketByCode, getViewerContext } from "@/lib/supabase/queries";

const ticketStatusMap = {
  active: "Activ",
  used: "Folosit",
  canceled: "Anulat",
  blocked: "Blocat",
} as const;

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketCode: string }>;
}) {
  await connection();
  const { ticketCode } = await params;
  const viewer = await getViewerContext();
  const ticket = await getTicketByCode(ticketCode, viewer);

  if (!ticket) {
    notFound();
  }

  const ticketUrl = `${env.siteUrl}/bilete/${ticket.ticketCode}`;
  const pdfUrl = `${env.siteUrl}/bilete/${ticket.ticketCode}/pdf`;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-[#d5a021]/20 bg-[#08140f] text-white">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
            <Badge className="rounded-full bg-[#123826] text-[#f8d376] hover:bg-[#123826]">
              {ticketStatusMap[ticket.status]}
            </Badge>
            <TicketQr ticket={ticket} />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                Cod unic
              </p>
              <p className="text-2xl font-semibold text-white">{ticket.ticketCode}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72">
              Afișează acest QR la intrare. După validarea reușită, biletul se marchează
              automat ca folosit.
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-[#e7dfbf] bg-white/95">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-[#7c5b0b]">
                    Bilet electronic
                  </p>
                  <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
                    {ticket.matchTitle}
                  </h1>
                </div>
                <Link
                  href={pdfUrl}
                  target="_blank"
                  className="inline-flex items-center rounded-full border border-[#d5a021]/30 px-4 py-2 text-sm font-medium text-[#7c5b0b]"
                >
                  <DownloadCloud className="mr-2 h-4 w-4" />
                  PDF
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Info title="Competiție" value={ticket.competitionName} />
                <Info title="Adversar" value={ticket.opponentName} />
                <Info
                  title="Data și ora"
                  value={format(new Date(ticket.startsAt), "EEEE, d MMMM yyyy • HH:mm", {
                    locale: ro,
                  })}
                />
                <Info title="Stadion" value={ticket.stadiumName} />
                <Info title="Sector" value={ticket.sectorName} />
                <Info title="Rând / Loc" value={`${ticket.rowLabel} / ${ticket.seatNumber}`} />
                <Info title="Poartă" value={ticket.gateName ?? "Nealocată"} />
                <Info title="Titular" value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Suporter"} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#e7dfbf] bg-white/95">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-[#11552d]" />
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
                  Acțiuni rapide
                </h2>
              </div>
              <ShareActions title={ticket.matchTitle} ticketUrl={ticketUrl} pdfUrl={pdfUrl} />
              <div className="rounded-3xl bg-[#f8f5e9] p-4 text-sm leading-6 text-slate-600">
                Poți partaja direct pagina biletului, PDF-ul sau folosi print din browser.
                Pentru validare steward-ul are nevoie doar de QR-ul semnat.
              </div>
            </CardContent>
          </Card>

          {viewer.isAdmin ? (
            <Card className="border-[#e7dfbf] bg-white/95">
              <CardContent className="space-y-4 p-6">
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
                  Control admin
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form action={reissueTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.ticketId} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#11552d] px-4 py-3 text-sm font-medium text-white"
                    >
                      Reemite QR
                    </button>
                  </form>
                  <form action={cancelTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.ticketId} />
                    <input type="hidden" name="reason" value="Anulat din panoul admin" />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-red-600 px-4 py-3 text-sm font-medium text-white"
                    >
                      Anulează biletul
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#efe6c7] bg-[#fffdf6] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#08140f]">{value}</p>
    </div>
  );
}
