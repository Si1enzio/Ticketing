import { redirect } from "next/navigation";
import { CalendarClock, Download, Ticket, UserRoundCheck } from "lucide-react";

import { TicketListItem } from "@/components/ticket-list-item";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewerContext, getViewerTickets } from "@/lib/supabase/queries";

export default async function CabinetPage() {
  const viewer = await getViewerContext();

  if (!viewer.isAuthenticated && isSupabaseConfigured()) {
    redirect("/autentificare");
  }

  const tickets = await getViewerTickets(viewer);
  const upcoming = tickets.filter((ticket) => new Date(ticket.startsAt) >= new Date());
  const archived = tickets.filter((ticket) => new Date(ticket.startsAt) < new Date());

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="rounded-full bg-[#123826] text-[#f8d376] hover:bg-[#123826]">
            Cabinet personal
          </Badge>
          <h1 className="mt-4 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
            Biletele mele
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Vizualizezi biletele active, istoricul de acces și toate datele necesare pentru
            descărcare PDF, tipărire sau partajare rapidă.
          </p>
        </div>
        <div className="rounded-3xl border border-[#d5a021]/15 bg-white/80 px-5 py-4 text-sm text-slate-600">
          {viewer.fullName ?? viewer.email ?? "Suporter demo"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Ticket} label="Bilete active" value={upcoming.length} />
        <SummaryCard icon={CalendarClock} label="Meciuri viitoare" value={upcoming.length} />
        <SummaryCard icon={Download} label="Istoric bilete" value={archived.length} />
      </div>

      <div className="space-y-4">
        <SectionTitle title="Următoarele meciuri" subtitle="Biletele active apar aici imediat după confirmarea rezervării." />
        {upcoming.length ? (
          <div className="grid gap-4">
            {upcoming.map((ticket) => (
              <TicketListItem key={ticket.ticketId} ticket={ticket} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nu ai încă bilete active"
            description="După ce rezervi locuri pentru un meci publicat, biletele apar instant aici."
          />
        )}
      </div>

      <div className="space-y-4">
        <SectionTitle title="Istoric și bilete folosite" subtitle="După meci poți vedea starea scanării și istoricul rezervărilor." />
        {archived.length ? (
          <div className="grid gap-4">
            {archived.map((ticket) => (
              <TicketListItem key={ticket.ticketId} ticket={ticket} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Istoricul este încă gol"
            description="Biletele scanate sau meciurile trecute vor apărea aici."
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
    <Card className="border-[#e7dfbf] bg-white/90">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-semibold text-[#08140f]">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123826] text-[#f8d376]">
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
      <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
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
    <Card className="border-dashed border-[#d5a021]/35 bg-[#fffdf6]">
      <CardContent className="space-y-2 p-8">
        <p className="text-lg font-semibold text-[#08140f]">{title}</p>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

