import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeInTimeZone } from "@/lib/date-time";
import type { PublicMatch } from "@/lib/domain/types";
import type { AppLocale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/translate";

export function MatchCard({
  match,
  locale,
  messages,
}: {
  match: PublicMatch;
  locale: AppLocale;
  messages: AppMessages;
}) {
  const t = (key: string) => translate(messages, key);
  const visualUrl = match.bannerUrl ?? match.posterUrl;

  return (
    <Card className="surface-panel overflow-hidden rounded-[28px] border border-white/60 bg-white/90">
      <div className="h-1.5 bg-[linear-gradient(90deg,#0B1A33_0%,#C9A24F_42%,#E7D6A5_100%)]" />
      {visualUrl ? (
        <div
          className="aspect-[16/9] border-b border-black/6 bg-cover bg-center"
          style={{ backgroundImage: `url("${visualUrl}")` }}
          aria-label={`Imagine eveniment ${match.title}`}
        />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center border-b border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(201,162,79,0.22),transparent_32%),linear-gradient(135deg,#0B1A33,#132641)] px-6 text-center">
          <p className="font-heading text-3xl uppercase tracking-[0.18em] text-white/92">
            {match.title}
          </p>
        </div>
      )}
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="rounded-full bg-[#0B1A33] px-3 py-1 text-white hover:bg-[#0B1A33]">
            {match.competitionName}
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-[#C9A24F]/25 bg-[#fffaf0] text-[#0B1A33]"
            >
              {match.ticketingMode === "paid"
                ? t("matchCard.paidOpen")
                : t("matchCard.freeOpen")}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-[#C9A24F]/25 bg-[#fffaf0] text-[#0B1A33]"
            >
              {match.availableEstimate} {t("matchCard.estimatedSeats")}
            </Badge>
          </div>
        </div>
        <div className="space-y-3">
          <CardTitle className="font-heading text-3xl uppercase tracking-[0.12em] text-[#111111]">
            {match.title}
          </CardTitle>
          <p className="text-sm leading-6 text-neutral-600">
            {match.description ?? t("matchCard.defaultDescription")}
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm text-neutral-600">
        <div className="flex items-center gap-3 rounded-2xl border border-black/6 bg-neutral-50 px-4 py-3">
          <CalendarClock className="h-5 w-5 text-[#C9A24F]" />
          <span>
            {formatDateTimeInTimeZone(match.startsAt, {
              locale: locale === "ru" ? "ru-RU" : "ro-RO",
              dateStyle: "full",
              timeStyle: "short",
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/6 bg-neutral-50 px-4 py-3">
          <MapPin className="h-5 w-5 text-[#C9A24F]" />
          <span>
            {match.stadiumName}, {match.city}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/6 bg-neutral-50 px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-[#C9A24F]" />
          <span>
            {t("matchCard.standardLimit")} {match.maxTicketsPerUser}{" "}
            {t("matchCard.ticketsPerAccount")}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-black/6 bg-gradient-to-r from-neutral-50 to-white sm:flex-row">
        <Button
          asChild
          className="w-full rounded-full border border-[#0B1A33] bg-[#0B1A33] text-white hover:bg-[#132641] sm:flex-1"
        >
          <Link href={`/meciuri/${match.slug}`}>{t("matchCard.details")}</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full rounded-full border-[#C9A24F] bg-white text-[#0B1A33] hover:bg-[#fffaf0] sm:flex-1"
        >
          <Link href={`/meciuri/${match.slug}/rezerva`}>
            {match.ticketingMode === "paid" ? t("matchCard.buyPaid") : t("matchCard.getFree")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
