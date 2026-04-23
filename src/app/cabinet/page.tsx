import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CalendarClock, Download, DownloadCloud, Ticket, UserRoundCheck } from "lucide-react";

import { ProfileDetailsForm } from "@/components/profile-details-form";
import { TicketListItem } from "@/components/ticket-list-item";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TicketCard } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/env";
import { formatSeatPosition } from "@/lib/format/seat";
import { getServerI18n } from "@/lib/i18n/server";
import { getUserSubscriptions } from "@/lib/supabase/reports";
import {
  getViewerContext,
  getViewerProfileDetails,
  getViewerTickets,
} from "@/lib/supabase/queries";

export default async function CabinetPage() {
  await connection();
  const viewer = await getViewerContext();
  const { locale, messages } = await getServerI18n();

  if (!viewer.isAuthenticated && isSupabaseConfigured()) {
    redirect("/autentificare?next=/cabinet");
  }

  const [tickets, subscriptions, profile] = await Promise.all([
    getViewerTickets(viewer),
    viewer.userId ? getUserSubscriptions(viewer.userId) : Promise.resolve([]),
    getViewerProfileDetails(viewer),
  ]);

  const now = new Date();
  const upcoming = tickets.filter(
    (ticket) => ticket.status === "active" && new Date(ticket.startsAt) >= now,
  );
  const archived = tickets.filter(
    (ticket) => ticket.status !== "active" || new Date(ticket.startsAt) < now,
  );
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const isSuperadmin = viewer.roles.includes("superadmin");
  const hasMultiTicketUpcomingMatch = upcoming.some(
    (ticket, index) => upcoming.findIndex((item) => item.matchId === ticket.matchId) !== index,
  );
  const upcomingGroups = groupTicketsByMatch(upcoming);
  const archivedGroups = groupTicketsByMatch(archived);
  const reservationBundles = isSuperadmin ? groupTicketsByReservation(tickets) : [];

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="rounded-full border border-[#dc2626]/15 bg-[#fff1f2] text-[#b91c1c] hover:bg-[#fff1f2]">
            {messages.cabinet.badge}
          </Badge>
          <h1 className="mt-4 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
            {messages.cabinet.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
            {messages.cabinet.description}
          </p>
        </div>
        <div className="rounded-[28px] border border-black/6 bg-white/80 px-5 py-4 text-sm text-neutral-600 shadow-[0_18px_60px_-42px_rgba(23,23,23,0.35)]">
          <p className="font-semibold text-[#111111]">
            {viewer.fullName ?? viewer.email ?? "Suporter demo"}
          </p>
          <p className="mt-1">{messages.cabinet.ticketingActive}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={Ticket}
          label={messages.cabinet.summary.activeTickets}
          value={upcoming.length}
        />
        <SummaryCard
          icon={CalendarClock}
          label={messages.cabinet.summary.upcomingMatches}
          value={upcomingGroups.length}
        />
        <SummaryCard
          icon={Download}
          label={messages.cabinet.summary.history}
          value={archived.length}
        />
        <SummaryCard
          icon={UserRoundCheck}
          label={messages.cabinet.summary.subscriptions}
          value={activeSubscriptions.length}
        />
      </div>

      {profile ? (
        <div className="space-y-4">
          <SectionTitle
            title="Profil si contact"
            subtitle="Completeaza datele utile pentru acces, comunicare si activitati CRM. Aceste informatii sunt vizibile administratorilor."
          />
          <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/94">
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
            <CardContent className="space-y-5 p-6">
              <div className="grid gap-3 rounded-[24px] border border-black/6 bg-neutral-50 p-4 text-sm text-neutral-700 md:grid-cols-3">
                <InfoTile label="Cont autentificare" value={profile.email ?? "Nedefinit"} />
                <InfoTile
                  label="Cod suporter"
                  value={viewer.userId?.slice(0, 8).toUpperCase() ?? "-"}
                />
                <InfoTile label="Varsta estimata" value={getAgeLabel(profile.birthDate)} />
              </div>
              <ProfileDetailsForm profile={profile} locale={locale} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-4">
        <SectionTitle
          title={messages.cabinet.sections.subscriptionsTitle}
          subtitle="Abonamentele active includ stadionul, locul tau fix si documentul de prezentat la acces."
        />
        {activeSubscriptions.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeSubscriptions.map((subscription) => (
              <Card
                key={subscription.id}
                className="surface-panel rounded-[28px] border border-white/70 bg-white/92"
              >
                <CardContent className="space-y-3 p-5">
                  <p className="font-semibold text-[#111111]">{subscription.product.name}</p>
                  <p className="text-sm text-neutral-600">
                    Valabil pana la{" "}
                    {new Date(subscription.endsAt).toLocaleDateString(
                      locale === "ru" ? "ru-RU" : "ro-RO",
                    )}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Stadion: {subscription.stadiumName ?? "Nedefinit"} -{" "}
                    {formatSeatPosition(subscription)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                    {subscription.product.durationMonths} luni -{" "}
                    {(subscription.pricePaidCents / 100).toFixed(2)} {subscription.currency}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      href={`/abonamente/${subscription.subscriptionCode}`}
                      className="inline-flex items-center rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-neutral-100"
                    >
                      Deschide abonamentul
                    </Link>
                    <Link
                      href={`/abonamente/${subscription.subscriptionCode}/pdf?download=1`}
                      target="_blank"
                      className="inline-flex items-center rounded-full border border-[#dc2626]/18 bg-[#fff1f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
                    >
                      <DownloadCloud className="mr-2 h-4 w-4" />
                      Descarca PDF
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title={messages.cabinet.empty.noSubscriptionsTitle}
            description={messages.cabinet.empty.noSubscriptionsDescription}
          />
        )}
      </div>

      <div className="space-y-4">
        {reservationBundles.length ? (
          <>
            <SectionTitle
              title="Bundle-uri emise"
              subtitle="Pentru superadmin, fiecare rezervare cu mai multe bilete poate fi tratata ca un grup separat de tiparit sau descarcat pentru parteneri, sponsori sau invitati."
            />
            <div className="grid gap-4">
              {reservationBundles.map((bundle) => (
                <ReservationBundleCard key={bundle.reservationId} bundle={bundle} locale={locale} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-4">
        <SectionTitle
          title={messages.cabinet.sections.upcomingTitle}
          subtitle={messages.cabinet.sections.upcomingSubtitle}
        />
        {hasMultiTicketUpcomingMatch ? (
          <Card className="rounded-[28px] border border-[#dc2626]/12 bg-[#fff7f7]">
            <CardContent className="p-5 text-sm leading-7 text-neutral-700">
              {locale === "ru"
                ? "Esli na odin match u tebya est neskolko biletov, deschide primul si gliseaza intre QR-uri."
                : "Daca ai mai multe bilete pentru acelasi meci, deschide primul bilet si gliseaza stanga-dreapta in pagina lui pentru a trece rapid intre QR-uri."}
            </CardContent>
          </Card>
        ) : null}
        {upcoming.length ? (
          <div className="grid gap-6">
            {upcomingGroups.map((group) => (
              <div key={group.matchId} className="space-y-3">
                {group.tickets.length > 1 ? (
                  <MatchTicketGroupCard
                    matchId={group.matchId}
                    matchTitle={group.matchTitle}
                    count={group.tickets.length}
                  />
                ) : null}
                <div className="grid gap-4">
                  {group.tickets.map((ticket) => (
                    <TicketListItem
                      key={ticket.ticketId}
                      ticket={ticket}
                      locale={locale}
                      messages={messages}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={messages.cabinet.empty.noTicketsTitle}
            description={messages.cabinet.empty.noTicketsDescription}
          />
        )}
      </div>

      <div className="space-y-4">
        <SectionTitle
          title={messages.cabinet.sections.historyTitle}
          subtitle={messages.cabinet.sections.historySubtitle}
        />
        {archived.length ? (
          <div className="grid gap-6">
            {archivedGroups.map((group) => (
              <div key={group.matchId} className="space-y-3">
                {group.tickets.length > 1 ? (
                  <MatchTicketGroupCard
                    matchId={group.matchId}
                    matchTitle={group.matchTitle}
                    count={group.tickets.length}
                  />
                ) : null}
                <div className="grid gap-4">
                  {group.tickets.map((ticket) => (
                    <TicketListItem
                      key={ticket.ticketId}
                      ticket={ticket}
                      locale={locale}
                      messages={messages}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={messages.cabinet.empty.noHistoryTitle}
            description={messages.cabinet.empty.noHistoryDescription}
          />
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRoundCheck;
  label: string;
  value: number;
}) {
  return (
    <Card className="surface-panel rounded-[28px] border border-white/70 bg-white/92">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="mt-2 text-4xl font-semibold text-[#111111]">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111111] text-white">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{subtitle}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-[28px] border-dashed border-black/10 bg-white/78">
      <CardContent className="space-y-2 p-8">
        <p className="text-lg font-semibold text-[#111111]">{title}</p>
        <p className="max-w-2xl text-sm leading-6 text-neutral-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function MatchTicketGroupCard({
  matchId,
  matchTitle,
  count,
}: {
  matchId: string;
  matchTitle: string;
  count: number;
}) {
  return (
    <Card className="rounded-[28px] border border-[#dc2626]/12 bg-[#fff7f7]">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#b91c1c]">
            Document grupat pentru meci
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">{matchTitle}</p>
          <p className="mt-1 text-sm text-neutral-600">{count} bilete in acelasi document</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/cabinet/meciuri/${matchId}/pdf`}
            target="_blank"
            className="inline-flex items-center rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-neutral-100"
          >
            Printeaza PDF grupat
          </Link>
          <Link
            href={`/cabinet/meciuri/${matchId}/pdf?download=1`}
            target="_blank"
            className="inline-flex items-center rounded-full border border-[#dc2626]/18 bg-[#fff1f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
          >
            <DownloadCloud className="mr-2 h-4 w-4" />
            Descarca PDF grupat
          </Link>
        </div>
        <SheetPrintLinks baseUrl={`/cabinet/meciuri/${matchId}/pdf`} labelPrefix="A4" />
      </CardContent>
    </Card>
  );
}

function ReservationBundleCard({
  bundle,
  locale,
}: {
  bundle: ReturnType<typeof groupTicketsByReservation>[number];
  locale: string;
}) {
  const issuedAt = new Date(bundle.issuedAt);

  return (
    <Card className="rounded-[28px] border border-[#dc2626]/12 bg-[#fff7f7]">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#b91c1c]">
            Bundle rezervare
          </p>
          <p className="mt-1 text-lg font-semibold text-[#111111]">{bundle.matchTitle}</p>
          <p className="mt-1 text-sm text-neutral-600">
            {bundle.tickets.length} bilete - emise la{" "}
            {issuedAt.toLocaleString(locale === "ru" ? "ru-RU" : "ro-RO")}
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Sursa: {bundle.source} - cod bundle {bundle.reservationId.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/cabinet/rezervari/${bundle.reservationId}/pdf`}
            target="_blank"
            className="inline-flex items-center rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-neutral-100"
          >
            Printeaza bundle
          </Link>
          <Link
            href={`/cabinet/rezervari/${bundle.reservationId}/pdf?download=1`}
            target="_blank"
            className="inline-flex items-center rounded-full border border-[#dc2626]/18 bg-[#fff1f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
          >
            <DownloadCloud className="mr-2 h-4 w-4" />
            Descarca bundle
          </Link>
          <Link
            href={`/confirmare/${bundle.reservationId}`}
            className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-neutral-100"
          >
            Vezi grupul
          </Link>
        </div>
        <SheetPrintLinks
          baseUrl={`/cabinet/rezervari/${bundle.reservationId}/pdf`}
          labelPrefix="Print taiere"
        />
      </CardContent>
    </Card>
  );
}

function SheetPrintLinks({ baseUrl, labelPrefix }: { baseUrl: string; labelPrefix: string }) {
  return (
    <div className="flex w-full basis-full flex-wrap items-center gap-2 border-t border-black/6 pt-3 text-xs text-neutral-600 md:justify-end">
      <span className="mr-1 font-medium text-[#111111]">{labelPrefix}:</span>
      {[3, 4, 6].map((count) => (
        <Link
          key={count}
          href={`${baseUrl}?layout=cut-sheet&perPage=${count}`}
          target="_blank"
          className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1.5 font-medium text-[#111111] transition hover:bg-neutral-100"
        >
          {count} / foaie
        </Link>
      ))}
      {[3, 4, 6].map((count) => (
        <Link
          key={`download-${count}`}
          href={`${baseUrl}?layout=cut-sheet&perPage=${count}&download=1`}
          target="_blank"
          className="inline-flex rounded-full border border-[#dc2626]/18 bg-[#fff1f2] px-3 py-1.5 font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
        >
          Descarca {count}
        </Link>
      ))}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-1 font-medium text-[#111111]">{value}</p>
    </div>
  );
}

function groupTicketsByMatch(tickets: TicketCard[]) {
  const groups = new Map<string, { matchId: string; matchTitle: string; tickets: TicketCard[] }>();

  for (const ticket of tickets) {
    const existing = groups.get(ticket.matchId);
    if (existing) {
      existing.tickets.push(ticket);
    } else {
      groups.set(ticket.matchId, {
        matchId: ticket.matchId,
        matchTitle: ticket.matchTitle,
        tickets: [ticket],
      });
    }
  }

  return Array.from(groups.values());
}

function groupTicketsByReservation(tickets: TicketCard[]) {
  const groups = new Map<
    string,
    {
      reservationId: string;
      matchId: string;
      matchTitle: string;
      issuedAt: string;
      source: string;
      tickets: TicketCard[];
    }
  >();

  for (const ticket of tickets) {
    const existing = groups.get(ticket.reservationId);

    if (existing) {
      existing.tickets.push(ticket);
      if (new Date(ticket.issuedAt) < new Date(existing.issuedAt)) {
        existing.issuedAt = ticket.issuedAt;
      }
      continue;
    }

    groups.set(ticket.reservationId, {
      reservationId: ticket.reservationId,
      matchId: ticket.matchId,
      matchTitle: ticket.matchTitle,
      issuedAt: ticket.issuedAt,
      source: ticket.source,
      tickets: [ticket],
    });
  }

  return Array.from(groups.values())
    .filter((bundle) => bundle.tickets.length > 1)
    .sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime());
}

function getAgeLabel(birthDate: string | null) {
  if (!birthDate) {
    return "Nedeclarata";
  }

  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age >= 0 ? `${age} ani` : "Nedeclarata";
}
