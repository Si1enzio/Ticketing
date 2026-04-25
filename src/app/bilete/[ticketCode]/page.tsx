import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { BadgeCheck, DownloadCloud, ShieldCheck, Sparkles } from "lucide-react";

import { cancelTicketAction, reissueTicketAction } from "@/lib/actions/admin";
import { BrandLogo } from "@/components/brand-logo";
import { DownloadTicketImageButton } from "@/components/download-ticket-image-button";
import { PrintTicketButton } from "@/components/print-ticket-button";
import { ShareActions } from "@/components/share-actions";
import { TicketQr } from "@/components/ticket-qr";
import { TicketSwipeShell } from "@/components/ticket-swipe-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatSeatPosition } from "@/lib/format/seat";
import { getServerI18n } from "@/lib/i18n/server";
import { getServerSiteOrigin } from "@/lib/site-url";
import type { TicketCard } from "@/lib/domain/types";
import { getTicketByCode, getViewerContext, getViewerTickets } from "@/lib/supabase/queries";

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
  const { locale } = await getServerI18n();
  const siteOrigin = await getServerSiteOrigin();
  const viewerTickets = viewer.userId ? await getViewerTickets(viewer) : [];
  const ownTicket = viewerTickets.find((item) => item.ticketCode === ticketCode) ?? null;
  const ticket = ownTicket ?? (await getTicketByCode(ticketCode, viewer));

  if (!ticket) {
    notFound();
  }

  const sameMatchTickets = ownTicket
    ? viewerTickets
        .filter((item) => item.matchId === ticket.matchId)
        .sort(sortTicketsForMatchNavigation)
    : [];
  const currentTicketIndex = sameMatchTickets.findIndex((item) => item.ticketCode === ticket.ticketCode);
  const sameReservationTickets = ownTicket
    ? viewerTickets
        .filter((item) => item.reservationId === ticket.reservationId)
        .sort(sortTicketsForMatchNavigation)
    : [];
  const isSuperadmin = viewer.roles.includes("superadmin");
  const previousTicket =
    currentTicketIndex > 0 ? sameMatchTickets[currentTicketIndex - 1] : null;
  const nextTicket =
    currentTicketIndex >= 0 && currentTicketIndex < sameMatchTickets.length - 1
      ? sameMatchTickets[currentTicketIndex + 1]
      : null;
  const swipeLabels =
    locale === "ru"
      ? {
          title: "Несколько билетов на этот матч",
          subtitle:
            "Проведи влево или вправо, чтобы быстро переключаться между QR-кодами этого матча.",
          previous: "Предыдущий билет",
          next: "Следующий билет",
          counter: "Билет {current} из {total}",
        }
      : {
          title: "Mai multe bilete pentru acelasi meci",
          subtitle:
            "Gliseaza stanga-dreapta pentru a trece rapid la urmatorul QR al acestui meci.",
          previous: "Biletul anterior",
          next: "Biletul urmator",
          counter: "Biletul {current} din {total}",
        };

  const ticketUrl = `${siteOrigin}/bilete/${ticket.ticketCode}`;
  const pdfUrl = `${siteOrigin}/bilete/${ticket.ticketCode}/pdf`;
  const imageUrl = `${siteOrigin}/bilete/${ticket.ticketCode}/image`;
  const pdfDownloadUrl = `${pdfUrl}?download=1`;
  const groupedPdfDownloadUrl =
    sameMatchTickets.length > 1
      ? `${siteOrigin}/cabinet/meciuri/${ticket.matchId}/pdf?download=1`
      : null;
  const reservationBundlePdfUrl =
    isSuperadmin && sameReservationTickets.length > 1
      ? `${siteOrigin}/cabinet/rezervari/${ticket.reservationId}/pdf`
      : null;
  const reservationBundlePdfDownloadUrl =
    reservationBundlePdfUrl ? `${reservationBundlePdfUrl}?download=1` : null;

  const ticketContent = (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="surface-dark overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(201,162,79,0.26),transparent_34%),linear-gradient(180deg,#0B1A33_0%,#081326_100%)] text-white">
          <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#E7D6A5_36%,#C9A24F_100%)]" />
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
            <BrandLogo
              variant="horizontal"
              className="h-10 w-[190px] rounded-full bg-white px-4 py-2 object-contain"
            />
            <Badge className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white hover:bg-white/8">
              {ticketStatusMap[ticket.status]}
            </Badge>
            <TicketQr ticket={ticket} />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Cod unic</p>
              <p className="text-2xl font-semibold text-white">{ticket.ticketCode}</p>
            </div>
            <div className="w-full rounded-[28px] border border-white/10 bg-white/6 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[#E7D6A5]" />
                <p className="text-sm leading-7 text-white/76">
                  Afiseaza acest QR la intrare. Dupa o validare reusita, biletul trece
                  automat in statusul folosit si nu mai poate fi reutilizat.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/94">
            <div className="h-1.5 bg-[linear-gradient(90deg,#0B1A33_0%,#C9A24F_45%,#E7D6A5_100%)]" />
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-[#C9A24F]">
                    Bilet electronic
                  </p>
                  <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
                    {ticket.matchTitle}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={pdfDownloadUrl}
                    target="_blank"
                    className="inline-flex items-center rounded-full border border-[#C9A24F]/25 bg-[#fffaf0] px-4 py-2 text-sm font-medium text-[#0B1A33] transition hover:bg-[#f7edcf]"
                  >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Descarca PDF
                  </Link>
                  {groupedPdfDownloadUrl ? (
                    <Link
                      href={groupedPdfDownloadUrl}
                      target="_blank"
                      className="inline-flex items-center rounded-full border border-[#C9A24F]/25 bg-[#fffaf0] px-4 py-2 text-sm font-medium text-[#0B1A33] transition hover:bg-[#f7edcf]"
                    >
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      PDF grupat
                    </Link>
                  ) : null}
                  {reservationBundlePdfDownloadUrl ? (
                    <Link
                      href={reservationBundlePdfDownloadUrl}
                      target="_blank"
                      className="inline-flex items-center rounded-full border border-[#C9A24F]/25 bg-[#fffaf0] px-4 py-2 text-sm font-medium text-[#0B1A33] transition hover:bg-[#f7edcf]"
                    >
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      Bundle rezervare
                    </Link>
                  ) : null}
                  <DownloadTicketImageButton imageUrl={imageUrl} />
                  <PrintTicketButton pdfUrl={pdfUrl} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Info title="Categorie / competitie" value={ticket.competitionName} />
                <Info
                  title="Data si ora"
                  value={format(new Date(ticket.startsAt), "EEEE, d MMMM yyyy - HH:mm", {
                    locale: ro,
                  })}
                />
                <Info title="Locatie" value={ticket.stadiumName} />
                <Info title="Sector" value={ticket.sectorName} />
                <Info title="Pozitie loc" value={formatSeatPosition(ticket)} />
                <Info title="Poarta" value={ticket.gateName ?? "Nealocata"} />
                <Info
                  title="Titular"
                  value={ticket.purchaserName ?? ticket.purchaserEmail ?? "Cont suporter"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/94">
            <div className="h-1.5 bg-[linear-gradient(90deg,#0B1A33_0%,#C9A24F_45%,#E7D6A5_100%)]" />
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-[#C9A24F]" />
                <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                  Actiuni rapide
                </h2>
              </div>
              <ShareActions
                title={ticket.matchTitle}
                ticketUrl={ticketUrl}
                pdfUrl={pdfUrl}
                imageUrl={imageUrl}
                ticketCode={ticket.ticketCode}
              />
              <div className="rounded-[26px] border border-black/6 bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">
                Poti partaja pagina biletului, descarca PDF-ul sau salva varianta verticala ca
                imagine in telefon pentru acces rapid la eveniment. Pentru steward este suficient
                QR-ul semnat.
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/94">
            <div className="h-1.5 bg-[linear-gradient(90deg,#0B1A33_0%,#C9A24F_45%,#E7D6A5_100%)]" />
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#C9A24F]" />
                <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                  Acces la eveniment
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TipCard
                  label="1. Deschide biletul"
                  text="Pastreaza pagina sau PDF-ul la indemana inainte sa ajungi la acces."
                />
                <TipCard
                  label="2. Afiseaza QR-ul"
                  text="Luminozitatea ecranului mareste viteza de scanare pentru steward."
                />
                <TipCard
                  label="3. Intra o singura data"
                  text="Dupa prima validare, biletul devine folosit si nu mai poate fi reluat."
                />
              </div>
            </CardContent>
          </Card>

          {viewer.isAdmin ? (
            <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/94">
              <div className="h-1.5 bg-[linear-gradient(90deg,#0B1A33_0%,#C9A24F_45%,#E7D6A5_100%)]" />
              <CardContent className="space-y-4 p-6">
                <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                  Control admin
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <form action={reissueTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.ticketId} />
                    <button
                      type="submit"
                      className="w-full rounded-full border border-[#111111] bg-[#111111] px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
                    >
                      Reemite QR
                    </button>
                  </form>
                  <form action={cancelTicketAction}>
                    <input type="hidden" name="ticketId" value={ticket.ticketId} />
                    <input type="hidden" name="reason" value="Anulat din panoul admin" />
                    <button
                      type="submit"
                      className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#b91c1c]"
                    >
                      Anuleaza biletul
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

  if (sameMatchTickets.length > 1 && currentTicketIndex >= 0) {
    return (
      <TicketSwipeShell
        previousHref={previousTicket ? `/bilete/${previousTicket.ticketCode}` : null}
        nextHref={nextTicket ? `/bilete/${nextTicket.ticketCode}` : null}
        currentIndex={currentTicketIndex}
        total={sameMatchTickets.length}
        labels={swipeLabels}
      >
        {ticketContent}
      </TicketSwipeShell>
    );
  }

  return ticketContent;
}

function sortTicketsForMatchNavigation(a: TicketCard, b: TicketCard) {
  const sectorComparison = a.sectorCode.localeCompare(b.sectorCode, "ro");
  if (sectorComparison !== 0) {
    return sectorComparison;
  }

  const rowA = Number.parseInt(a.rowLabel, 10);
  const rowB = Number.parseInt(b.rowLabel, 10);

  if (!Number.isNaN(rowA) && !Number.isNaN(rowB) && rowA !== rowB) {
    return rowA - rowB;
  }

  if (a.rowLabel !== b.rowLabel) {
    return a.rowLabel.localeCompare(b.rowLabel, "ro");
  }

  return a.seatNumber - b.seatNumber;
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-black/6 bg-neutral-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#111111]">{value}</p>
    </div>
  );
}

function TipCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[26px] border border-black/6 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-[#111111]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
    </div>
  );
}
