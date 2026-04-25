import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DownloadCloud, Printer, ShieldCheck } from "lucide-react";

import { SubscriptionQr } from "@/components/subscription-qr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateInTimeZone } from "@/lib/date-time";
import { formatSeatPosition } from "@/lib/format/seat";
import { getServerSiteOrigin } from "@/lib/site-url";
import { getSubscriptionByCode, getViewerContext } from "@/lib/supabase/queries";

const statusMap = {
  active: "Activ",
  expired: "Expirat",
  canceled: "Anulat",
} as const;

export default async function SubscriptionPage({
  params,
}: {
  params: PageProps<"/abonamente/[subscriptionCode]">["params"];
}) {
  await connection();
  const { subscriptionCode } = await params;
  const viewer = await getViewerContext();
  const siteOrigin = await getServerSiteOrigin();
  const subscription = await getSubscriptionByCode(subscriptionCode, viewer);

  if (!subscription) {
    notFound();
  }

  const pdfUrl = `${siteOrigin}/abonamente/${subscription.subscriptionCode}/pdf`;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="surface-dark overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.26),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
          <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
            <Badge className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-white hover:bg-white/8">
              {statusMap[subscription.status]}
            </Badge>
            <SubscriptionQr subscription={subscription} />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Cod abonament</p>
              <p className="text-2xl font-semibold text-white">{subscription.subscriptionCode}</p>
            </div>
            <div className="w-full rounded-[28px] border border-white/10 bg-white/6 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[#fca5a5]" />
                <p className="text-sm leading-7 text-white/76">
                  Abonamentul este valabil pentru toate meciurile din locatia alocata,
                  in perioada selectata, cu o singura intrare la fiecare meci.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="surface-panel overflow-hidden rounded-[32px] border border-white/70 bg-white/94">
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-[#b91c1c]">
                    Abonament locatie
                  </p>
                  <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
                    {subscription.product.name}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`${pdfUrl}?download=1`}
                    target="_blank"
                    className="inline-flex items-center rounded-full border border-[#dc2626]/18 bg-[#fff1f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
                  >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Descarca PDF
                  </Link>
                  <Link
                    href={pdfUrl}
                    target="_blank"
                    className="inline-flex items-center rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-neutral-100"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Printeaza
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Info label="Titular" value={subscription.holderName ?? "Abonat"} />
                <Info label="Email" value={subscription.holderEmail ?? "Nedeclarat"} />
                <Info label="Data nasterii" value={formatBirthDate(subscription.holderBirthDate)} />
                <Info
                  label="Valabilitate"
                  value={`${formatDateInTimeZone(subscription.startsAt, { locale: "ro-RO", dateStyle: "medium" })} - ${formatDateInTimeZone(subscription.endsAt, { locale: "ro-RO", dateStyle: "medium" })}`}
                />
                <Info label="Locatie" value={subscription.stadiumName ?? "Nedefinit"} />
                <Info label="Poarta" value={subscription.gateName ?? "Libera"} />
                <Info label="Sector" value={subscription.sectorName ?? "Fara sector"} />
                <Info
                  label="Pozitie loc"
                  value={formatSeatPosition(subscription)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-black/6 bg-neutral-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#111111]">{value}</p>
    </div>
  );
}

function formatBirthDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("ro-RO") : "Nedeclarata";
}
