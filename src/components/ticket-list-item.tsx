import { format } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, QrCode, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TicketCard } from "@/lib/domain/types";
import type { AppLocale } from "@/lib/i18n/config";
import { getDateFnsLocale } from "@/lib/i18n/date";
import type { AppMessages } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/translate";

export function TicketListItem({
  ticket,
  locale,
  messages,
}: {
  ticket: TicketCard;
  locale: AppLocale;
  messages: AppMessages;
}) {
  const startsAt = new Date(ticket.startsAt);
  const t = (key: string) => translate(messages, key);

  const statusMap = {
    active: { label: t("ticketList.status.active"), className: "bg-[#111111] text-white" },
    used: { label: t("ticketList.status.used"), className: "bg-neutral-700 text-white" },
    canceled: { label: t("ticketList.status.canceled"), className: "bg-[#fee2e2] text-[#b91c1c]" },
    blocked: { label: t("ticketList.status.blocked"), className: "bg-[#fff1f2] text-[#b91c1c]" },
  } as const;

  const status = statusMap[ticket.status];

  return (
    <Card className="surface-panel overflow-hidden rounded-[28px] border border-white/70 bg-white/94">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_40%,#fca5a5_100%)]" />
      <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`rounded-full ${status.className}`}>{status.label}</Badge>
            <span className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              {ticket.ticketCode}
            </span>
          </div>
          <div>
            <h3 className="font-heading text-3xl uppercase tracking-[0.08em] text-[#111111]">
              {ticket.matchTitle}
            </h3>
            <p className="text-sm text-neutral-600">{ticket.competitionName}</p>
          </div>
          <div className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
            <p>
              {format(startsAt, "EEEE, d MMMM yyyy - HH:mm", {
                locale: getDateFnsLocale(locale),
              })}
            </p>
            <p>
              {ticket.sectorName} - {t("ticketList.row")} {ticket.rowLabel} -{" "}
              {t("ticketList.seat")} {ticket.seatNumber}
            </p>
            <p>{ticket.stadiumName}</p>
            <p>{ticket.gateName ?? t("common.noGate")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
          >
            <Link href={`/bilete/${ticket.ticketCode}`}>
              <QrCode className="mr-2 h-4 w-4" />
              {t("ticketList.openTicket")}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
          >
            <Link href={`/meciuri/${ticket.matchSlug}`}>
              <Ticket className="mr-2 h-4 w-4" />
              {t("ticketList.viewMatch")}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-[#b91c1c] hover:bg-[#fff1f2]">
            <Link href={`/bilete/${ticket.ticketCode}/pdf`} target="_blank">
              {t("ticketList.pdf")} <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
