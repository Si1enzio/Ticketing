import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicMatch } from "@/lib/domain/types";

export function MatchCard({ match }: { match: PublicMatch }) {
  const startsAt = new Date(match.startsAt);

  return (
    <Card className="surface-panel overflow-hidden rounded-[28px] border border-white/60 bg-white/90">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_42%,#f87171_100%)]" />
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="rounded-full bg-[#111111] px-3 py-1 text-white hover:bg-[#111111]">
            {match.competitionName}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-[#dc2626]/18 bg-[#dc2626]/6 text-[#b91c1c]"
          >
            {match.availableEstimate} locuri estimate
          </Badge>
        </div>
        <div className="space-y-3">
          <CardTitle className="font-heading text-3xl uppercase tracking-[0.12em] text-[#111111]">
            {match.title}
          </CardTitle>
          <p className="text-sm leading-6 text-neutral-600">
            {match.description ??
              "Rezervare gratuita cu QR unic, acces steward si cabinet personal pentru suporteri."}
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 text-sm text-neutral-600">
        <div className="flex items-center gap-3 rounded-2xl border border-black/6 bg-neutral-50 px-4 py-3">
          <CalendarClock className="h-5 w-5 text-[#dc2626]" />
          <span>{format(startsAt, "EEEE, d MMMM yyyy • HH:mm", { locale: ro })}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/6 bg-neutral-50 px-4 py-3">
          <MapPin className="h-5 w-5 text-[#dc2626]" />
          <span>
            {match.stadiumName}, {match.city}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/6 bg-neutral-50 px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-[#dc2626]" />
          <span>Limita standard: {match.maxTicketsPerUser} bilete / cont</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-black/6 bg-gradient-to-r from-neutral-50 to-white sm:flex-row">
        <Button
          asChild
          className="w-full rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black sm:flex-1"
        >
          <Link href={`/meciuri/${match.slug}`}>Vezi detalii</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full rounded-full border-[#dc2626] bg-white text-[#b91c1c] hover:bg-[#fef2f2] sm:flex-1"
        >
          <Link href={`/meciuri/${match.slug}/rezerva`}>Rezerva locuri</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
