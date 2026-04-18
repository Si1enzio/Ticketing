import Link from "next/link";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";

import type { PublicMatch } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MatchCard({ match }: { match: PublicMatch }) {
  const startsAt = new Date(match.startsAt);

  return (
    <Card className="overflow-hidden border-white/10 bg-white/95 shadow-[0_24px_80px_-36px_rgba(8,20,15,0.6)] backdrop-blur">
      <div className="h-2 bg-gradient-to-r from-[#11552d] via-[#d5a021] to-[#11552d]" />
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="rounded-full bg-[#123826] text-[#f6c453] hover:bg-[#123826]">
            {match.competitionName}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-[#0e4c27]/20 text-[#0e4c27]"
          >
            {match.availableEstimate} locuri estimate
          </Badge>
        </div>
        <div>
          <CardTitle className="font-heading text-3xl uppercase tracking-[0.12em] text-[#08140f]">
            {match.title}
          </CardTitle>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {match.description ??
              "Rezervare gratuită cu QR unic, acces steward și cabinet personal pentru suporteri."}
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-3 rounded-2xl bg-[#f6f5ef] px-4 py-3">
          <CalendarClock className="h-5 w-5 text-[#11552d]" />
          <span>
            {format(startsAt, "EEEE, d MMMM yyyy • HH:mm", { locale: ro })}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#f6f5ef] px-4 py-3">
          <MapPin className="h-5 w-5 text-[#11552d]" />
          <span>
            {match.stadiumName}, {match.city}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#f6f5ef] px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-[#11552d]" />
          <span>Limită standard: {match.maxTicketsPerUser} bilete / cont</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          className="w-full rounded-full bg-[#11552d] hover:bg-[#0d4222] sm:flex-1"
        >
          <Link href={`/meciuri/${match.slug}`}>Vezi detalii</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full rounded-full border-[#d5a021] text-[#7c5b0b] hover:bg-[#fff9e7] sm:flex-1"
        >
          <Link href={`/meciuri/${match.slug}/rezerva`}>Rezervă locuri</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
