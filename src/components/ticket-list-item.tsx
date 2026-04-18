import Link from "next/link";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ArrowUpRight, QrCode, Ticket } from "lucide-react";

import type { TicketCard } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusMap = {
  active: { label: "Activ", className: "bg-[#11552d] text-white" },
  used: { label: "Folosit", className: "bg-slate-700 text-white" },
  canceled: { label: "Anulat", className: "bg-red-100 text-red-700" },
  blocked: { label: "Blocat", className: "bg-amber-100 text-amber-800" },
} as const;

export function TicketListItem({ ticket }: { ticket: TicketCard }) {
  const startsAt = new Date(ticket.startsAt);
  const status = statusMap[ticket.status];

  return (
    <Card className="overflow-hidden border-[#e7dfbf] bg-white/95">
      <div
        className="h-2"
        style={{ backgroundColor: ticket.sectorColor || "#11552d" }}
      />
      <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`rounded-full ${status.className}`}>{status.label}</Badge>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {ticket.ticketCode}
            </span>
          </div>
          <div>
            <h3 className="font-heading text-3xl uppercase tracking-[0.1em] text-[#08140f]">
              {ticket.matchTitle}
            </h3>
            <p className="text-sm text-slate-600">{ticket.competitionName}</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              {format(startsAt, "EEEE, d MMMM yyyy • HH:mm", { locale: ro })}
            </p>
            <p>
              {ticket.sectorName} • Rând {ticket.rowLabel} • Loc {ticket.seatNumber}
            </p>
            <p>{ticket.stadiumName}</p>
            <p>{ticket.gateName ?? "Fără poartă alocată"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="rounded-full bg-[#11552d] hover:bg-[#0e4524]">
            <Link href={`/bilete/${ticket.ticketCode}`}>
              <QrCode className="mr-2 h-4 w-4" />
              Deschide biletul
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/meciuri/${ticket.matchSlug}`}>
              <Ticket className="mr-2 h-4 w-4" />
              Vezi meciul
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link href={`/bilete/${ticket.ticketCode}/pdf`} target="_blank">
              PDF <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

