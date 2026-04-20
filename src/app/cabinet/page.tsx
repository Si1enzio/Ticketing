import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CalendarClock, Download, Ticket, UserRoundCheck } from "lucide-react";

import { TicketListItem } from "@/components/ticket-list-item";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerI18n } from "@/lib/i18n/server";
import { getUserSubscriptions } from "@/lib/supabase/reports";
import { getViewerContext, getViewerTickets } from "@/lib/supabase/queries";

export default async function CabinetPage() {
  await connection();
  const viewer = await getViewerContext();
  const { locale, messages } = await getServerI18n();

  if (!viewer.isAuthenticated && isSupabaseConfigured()) {
    redirect("/autentificare?next=/cabinet");
  }

  const [tickets, subscriptions] = await Promise.all([
    getViewerTickets(viewer),
    viewer.userId ? getUserSubscriptions(viewer.userId) : Promise.resolve([]),
  ]);
  const now = new Date();
  const upcoming = tickets.filter(
    (ticket) => ticket.status === "active" && new Date(ticket.startsAt) >= now,
  );
  const archived = tickets.filter(
    (ticket) => ticket.status !== "active" || new Date(ticket.startsAt) < now,
  );
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");

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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={Ticket}
          label={messages.cabinet.summary.activeTickets}
          value={upcoming.length}
        />
        <SummaryCard
          icon={CalendarClock}
          label={messages.cabinet.summary.upcomingMatches}
          value={upcoming.length}
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

      <div className="space-y-4">
        <SectionTitle
          title={messages.cabinet.sections.subscriptionsTitle}
          subtitle={messages.cabinet.sections.subscriptionsSubtitle}
        />
        {activeSubscriptions.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeSubscriptions.map((subscription) => (
              <Card
                key={subscription.id}
                className="surface-panel rounded-[28px] border border-white/70 bg-white/92"
              >
                <CardContent className="space-y-2 p-5">
                  <p className="font-semibold text-[#111111]">{subscription.product.name}</p>
                  <p className="text-sm text-neutral-600">
                    {messages.cabinet.subscriptionValidUntil}{" "}
                    {new Date(subscription.endsAt).toLocaleDateString(
                      locale === "ru" ? "ru-RU" : "ro-RO",
                    )}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                    {subscription.product.durationMonths} {messages.cabinet.months} ·{" "}
                    {(subscription.pricePaidCents / 100).toFixed(2)} {subscription.currency}
                  </p>
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
        <SectionTitle
          title={messages.cabinet.sections.upcomingTitle}
          subtitle={messages.cabinet.sections.upcomingSubtitle}
        />
        {upcoming.length ? (
          <div className="grid gap-4">
            {upcoming.map((ticket) => (
              <TicketListItem
                key={ticket.ticketId}
                ticket={ticket}
                locale={locale}
                messages={messages}
              />
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
          <div className="grid gap-4">
            {archived.map((ticket) => (
              <TicketListItem
                key={ticket.ticketId}
                ticket={ticket}
                locale={locale}
                messages={messages}
              />
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
