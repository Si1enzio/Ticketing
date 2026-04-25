import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

import { AdminSubscriptionAssignmentForm } from "@/components/admin/admin-subscription-assignment-form";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateInTimeZone, formatDateTimeInTimeZone } from "@/lib/date-time";
import { formatSectorSeatPosition, formatSeatPosition } from "@/lib/format/seat";
import { getStadiumBuilderData, getAdminUserProfileDetails } from "@/lib/supabase/queries";
import {
  getAdminUserStats,
  getSubscriptionProducts,
  getUserScanLogs,
  getUserSubscriptions,
} from "@/lib/supabase/reports";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await connection();
  const { userId } = await params;

  const [stats, profile, scanLogs, subscriptions, products, stadiums] = await Promise.all([
    getAdminUserStats(userId),
    getAdminUserProfileDetails(userId),
    getUserScanLogs(userId),
    getUserSubscriptions(userId),
    getSubscriptionProducts(),
    getStadiumBuilderData(),
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
          Roluri: {stats.roles.join(", ")} - acces bilete: {stats.canReserve ? "activ" : "oprit"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rezervate total" value={stats.totalReserved} />
        <MetricCard label="Intrari validate" value={stats.totalScanned} />
        <MetricCard label="Abuse score" value={stats.abuseScore} />
        <MetricCard label="No-show" value={`${Math.round((stats.noShowRatio ?? 0) * 100)}%`} />
        <MetricCard label="Bilete platite" value={stats.paidTickets} />
        <MetricCard label="Bilete gratuite" value={stats.nonPaidTickets} />
        <MetricCard label="Abonamente active" value={stats.activeSubscriptions} />
        <MetricCard
          label="Total incasat"
          value={`${(stats.totalPaidCents / 100).toFixed(2)} MDL`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Profil CRM
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Date utile pentru segmentare, comunicare si validare la abonamente.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Email cont" value={profile?.email ?? stats.email ?? "Nedefinit"} />
              <InfoCard label="Email contact" value={profile?.contactEmail ?? "Nedeclarat"} />
              <InfoCard label="Telefon" value={profile?.phone ?? "Nedeclarat"} />
              <InfoCard label="Localitate" value={profile?.locality ?? "Nedeclarata"} />
              <InfoCard label="Raion / judet" value={profile?.district ?? "Nedeclarat"} />
              <InfoCard label="Sex" value={formatGender(profile?.gender ?? "unspecified")} />
              <InfoCard
                label="Data nasterii"
                value={profile?.birthDate ? format(new Date(profile.birthDate), "d MMM yyyy", { locale: ro }) : "Nedeclarata"}
              />
              <InfoCard label="Varsta" value={getAgeLabel(profile?.birthDate ?? null)} />
              <InfoCard
                label="Limba preferata"
                value={profile?.preferredLanguage === "ru" ? "Rusa" : "Romana"}
              />
              <InfoCard
                label="Consimtamant marketing"
                value={profile?.marketingOptIn ? "Da" : "Nu"}
              />
              <InfoCard label="Consimtamant SMS" value={profile?.smsOptIn ? "Da" : "Nu"} />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Abonamente
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Atribui produsul, stadionul si locul fix pe care il va pastra utilizatorul pe toata perioada.
              </p>
            </div>

            <AdminSubscriptionAssignmentForm
              userId={stats.userId}
              products={products}
              stadiums={stadiums}
            />

            <div className="grid gap-3">
              {subscriptions.length ? (
                subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="rounded-[22px] border border-black/6 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#111111]">{subscription.product.name}</p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {formatDateInTimeZone(subscription.startsAt, {
                            locale: "ro-RO",
                            dateStyle: "medium",
                          })}{" "}
                          -{" "}
                          {formatDateInTimeZone(subscription.endsAt, {
                            locale: "ro-RO",
                            dateStyle: "medium",
                          })}
                        </p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        {subscription.status}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                      <p>Cod: {subscription.subscriptionCode}</p>
                      <p>Stadion: {subscription.stadiumName ?? "Nedefinit"}</p>
                      <p>Sector: {subscription.sectorName ?? "Fara sector"}</p>
                      <p>Pozitie: {formatSeatPosition(subscription)}</p>
                      <p>Poarta: {subscription.gateName ?? "Libera"}</p>
                      <p>
                        Valoare: {(subscription.pricePaidCents / 100).toFixed(2)} {subscription.currency}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        href={`/abonamente/${subscription.subscriptionCode}`}
                        className="inline-flex items-center rounded-full border border-[#111111] bg-white px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-neutral-100"
                      >
                        Deschide documentul
                      </Link>
                      <Link
                        href={`/abonamente/${subscription.subscriptionCode}/pdf?download=1`}
                        target="_blank"
                        className="inline-flex items-center rounded-full border border-[#dc2626]/18 bg-[#fff1f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
                      >
                        Descarca PDF
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyPanel text="Acest utilizator nu are inca abonamente alocate." />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Istoric scanare
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Ultimele intrari, poarta folosita, stewardul si tipul credentialului scanat.
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
                        {scan.credentialKind === "subscription" ? "Abonament" : "Bilet"}:{" "}
                        {scan.subscriptionCode ?? scan.ticketCode ?? "Cod lipsa"} -{" "}
                        {formatSectorSeatPosition(scan)}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                      {scan.result}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
                    <p>
                      Scanat:{" "}
                      {formatDateTimeInTimeZone(scan.scannedAt, {
                        locale: "ro-RO",
                        includeSeconds: true,
                      })}
                    </p>
                    <p>Poarta: {scan.gateName ?? "Nedefinita"}</p>
                    <p>Dispozitiv: {scan.deviceLabel ?? "Necunoscut"}</p>
                    <p>Steward: {scan.stewardName ?? scan.stewardEmail ?? "Necunoscut"}</p>
                    <p>Titular: {scan.holderName ?? scan.holderEmail ?? "Necunoscut"}</p>
                    <p>
                      Data nasterii:{" "}
                      {scan.holderBirthDate
                        ? format(new Date(scan.holderBirthDate), "d MMM yyyy", { locale: ro })
                        : "Nedeclarata"}
                    </p>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/6 bg-neutral-50 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#111111]">{value}</p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/10 bg-white/75 p-5 text-sm text-neutral-600">
      {text}
    </div>
  );
}

function formatGender(value: string) {
  switch (value) {
    case "male":
      return "Masculin";
    case "female":
      return "Feminin";
    case "other":
      return "Altul";
    default:
      return "Nedeclarat";
  }
}

function getAgeLabel(birthDate: string | null) {
  if (!birthDate) {
    return "Nedeclarata";
  }

  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age >= 0 ? `${age} ani` : "Nedeclarata";
}
