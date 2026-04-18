import { notFound } from "next/navigation";
import { connection } from "next/server";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

import { assignUserSubscriptionAction } from "@/lib/actions/admin";
import {
  getAdminUserStats,
  getSubscriptionProducts,
  getUserScanLogs,
  getUserSubscriptions,
} from "@/lib/supabase/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await connection();
  const { userId } = await params;

  const [stats, scanLogs, subscriptions, products] = await Promise.all([
    getAdminUserStats(userId),
    getUserScanLogs(userId),
    getUserSubscriptions(userId),
    getSubscriptionProducts(),
  ]);

  if (!stats) {
    notFound();
  }

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Statistica utilizator
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          {stats.fullName ?? stats.email ?? "Profil fara nume"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-neutral-600">
          Roluri: {stats.roles.join(", ")} · acces bilete: {stats.canReserve ? "activ" : "oprit"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rezervate total" value={stats.totalReserved} />
        <MetricCard label="Intrari validate" value={stats.totalScanned} />
        <MetricCard label="Abuse score" value={stats.abuseScore} />
        <MetricCard
          label="No-show"
          value={`${Math.round((stats.noShowRatio ?? 0) * 100)}%`}
        />
        <MetricCard label="Bilete platite" value={stats.paidTickets} />
        <MetricCard label="Bilete gratuite" value={stats.nonPaidTickets} />
        <MetricCard label="Abonamente active" value={stats.activeSubscriptions} />
        <MetricCard
          label="Total incasat"
          value={`${(stats.totalPaidCents / 100).toFixed(2)} MDL`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Abonamente
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Poti aloca direct un abonament anual sau semi-anual.
              </p>
            </div>

            <form action={assignUserSubscriptionAction} className="grid gap-4 rounded-[24px] border border-black/6 bg-neutral-50 p-4">
              <input type="hidden" name="userId" value={stats.userId} />
              <div className="grid gap-2">
                <Label htmlFor="productId">Produs</Label>
                <select
                  id="productId"
                  name="productId"
                  className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {(product.priceCents / 100).toFixed(2)} {product.currency}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Valabil din</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Nota</Label>
                <Input id="note" name="note" placeholder="Abonament emis de administratie" />
              </div>
              <Button
                type="submit"
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Atribuie abonament
              </Button>
            </form>

            <div className="grid gap-3">
              {subscriptions.length ? (
                subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="rounded-[22px] border border-black/6 bg-neutral-50 p-4"
                  >
                    <p className="font-semibold text-[#111111]">{subscription.product.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {format(new Date(subscription.startsAt), "d MMM yyyy", { locale: ro })} -{" "}
                      {format(new Date(subscription.endsAt), "d MMM yyyy", { locale: ro })}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-neutral-500">
                      {subscription.status} · {(subscription.pricePaidCents / 100).toFixed(2)}{" "}
                      {subscription.currency}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyPanel text="Acest utilizator nu are inca abonamente alocate." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Istoric scanare
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Ultimele intrari, poarta folosita, steward si codul scanat.
              </p>
            </div>

            <div className="grid gap-3">
              {scanLogs.length ? (
                scanLogs.map((scan) => (
                  <div
                    key={scan.id}
                    className="rounded-[22px] border border-black/6 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#111111]">{scan.matchTitle}</p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {scan.ticketCode ?? "Cod lipsa"} · {scan.sectorName ?? "Sector"} ·{" "}
                          {scan.rowLabel ?? "-"} / {scan.seatNumber ?? "-"}
                        </p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        {scan.result}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                      <p>
                        Scanat:{" "}
                        {format(new Date(scan.scannedAt), "d MMM yyyy, HH:mm:ss", {
                          locale: ro,
                        })}
                      </p>
                      <p>Poarta: {scan.gateName ?? "Nedefinita"}</p>
                      <p>Dispozitiv: {scan.deviceLabel ?? "Necunoscut"}</p>
                      <p>Steward: {scan.stewardName ?? scan.stewardEmail ?? "Necunoscut"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyPanel text="Nu exista scanari pentru acest utilizator." />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="surface-panel rounded-[28px] border border-white/70 bg-white/92">
      <CardContent className="p-5">
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="mt-2 text-4xl font-semibold text-[#111111]">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/10 bg-white/75 p-5 text-sm text-neutral-600">
      {text}
    </div>
  );
}
