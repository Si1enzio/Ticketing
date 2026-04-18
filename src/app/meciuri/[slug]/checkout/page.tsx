import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Clock3, CreditCard, ShieldCheck, Ticket } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { DemoCheckoutButton } from "@/components/demo-checkout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCheckoutSummary,
  getPublicMatchBySlug,
  getViewerContext,
} from "@/lib/supabase/queries";
import { formatCurrencyFromCents } from "@/lib/utils";

export default async function MatchCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ hold?: string }>;
}) {
  await connection();
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const holdToken = resolvedSearchParams.hold ?? "";
  const viewer = await getViewerContext();

  if (!viewer.isAuthenticated) {
    redirect(`/autentificare?next=/meciuri/${slug}/checkout?hold=${holdToken}`);
  }

  const match = await getPublicMatchBySlug(slug);

  if (!match) {
    notFound();
  }

  if (match.ticketingMode !== "paid" && !viewer.isPrivileged) {
    redirect(`/meciuri/${slug}/rezerva`);
  }

  const summary = holdToken
    ? await getCheckoutSummary(match.id, holdToken, viewer)
    : null;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Checkout bilete
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          {match.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
          Pentru MVP am activat un checkout demo sigur pentru testare. Fluxul este deja
          pregatit pentru integrarea ulterioara cu un procesator real de plati.
        </p>
      </div>

      {!summary ? (
        <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/95">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-8">
            <div className="flex items-center gap-3 text-[#b91c1c]">
              <Clock3 className="h-6 w-6" />
              <span className="text-sm uppercase tracking-[0.28em]">
                Hold lipsa sau expirat
              </span>
            </div>
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Reia selectia
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                Nu am gasit un hold activ pentru acest checkout. Revino pe harta
                locurilor, selecteaza din nou locurile si continua imediat spre plata.
              </p>
            </div>
            <Button
              asChild
              className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              <Link href={`/meciuri/${slug}/rezerva`}>
                <Ticket className="mr-2 h-4 w-4" />
                Inapoi la selectie
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/95">
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
            <CardContent className="space-y-5 p-8">
              <div className="flex items-center gap-3 text-[#b91c1c]">
                <CreditCard className="h-6 w-6" />
                <span className="text-sm uppercase tracking-[0.28em]">Sumar comanda</span>
              </div>

              <div>
                <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                  {summary.matchTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-neutral-600">
                  {format(new Date(summary.startsAt), "EEEE, d MMMM yyyy • HH:mm", {
                    locale: ro,
                  })}{" "}
                  • {summary.stadiumName}
                </p>
              </div>

              <div className="grid gap-3">
                {summary.items.map((item) => (
                  <div
                    key={item.seatId}
                    className="flex items-center justify-between rounded-[24px] border border-black/6 bg-neutral-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-[#111111]">{item.sectorName}</p>
                      <p className="text-sm text-neutral-600">
                        Rand {item.rowLabel} • Loc {item.seatNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#111111]">
                        {formatCurrencyFromCents(summary.ticketPriceCents, summary.currency)}
                      </p>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        {item.gateName ?? "Poarta standard"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="surface-dark overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.26),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
            <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
            <CardContent className="space-y-5 p-8">
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/78">
                Hold-ul tau este activ pana la{" "}
                <span className="font-semibold text-white">
                  {format(new Date(summary.expiresAt), "HH:mm:ss", { locale: ro })}
                </span>
                . Dupa expirare, locurile revin automat in vanzare.
              </div>

              <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>Pret / loc</span>
                  <span>{formatCurrencyFromCents(summary.ticketPriceCents, summary.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>Numar bilete</span>
                  <span>{summary.items.length}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-lg font-semibold text-white">
                  <span>Total</span>
                  <span>{formatCurrencyFromCents(summary.totalAmountCents, summary.currency)}</span>
                </div>
              </div>

              <div className="rounded-[26px] border border-[#fecaca]/20 bg-[#dc2626]/12 p-4 text-sm leading-7 text-white/80">
                <div className="mb-2 flex items-center gap-2 text-[#fecaca]">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.24em]">
                    Checkout demo activ
                  </span>
                </div>
                Plata demo confirma comanda si emite imediat biletele. Nu sunt debitate
                fonduri reale in acest MVP.
              </div>

              <DemoCheckoutButton matchId={summary.matchId} holdToken={summary.holdToken} />

              <Button
                asChild
                variant="outline"
                className="w-full rounded-full border-white/12 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href={`/meciuri/${slug}/rezerva`}>Inapoi la selectie</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
