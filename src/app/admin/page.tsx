import type { Route } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Ban, ScanLine, Ticket, UsersRound } from "lucide-react";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminMatchOverview, getAdminUsersOverview } from "@/lib/supabase/queries";

export default async function AdminDashboardPage() {
  await connection();
  const [matches, users] = await Promise.all([
    getAdminMatchOverview(),
    getAdminUsersOverview(),
  ]);

  const totalIssued = matches.reduce((sum, item) => sum + item.issuedCount, 0);
  const totalScanned = matches.reduce((sum, item) => sum + item.scannedCount, 0);
  const totalDuplicates = matches.reduce(
    (sum, item) => sum + item.duplicateScanAttempts,
    0,
  );
  const suspiciousUsers = users.filter((user) => user.abuseScore >= 30).length;
  const noShowCount = matches.reduce((sum, item) => sum + item.noShowCount, 0);

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="surface-dark overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.22),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] text-white">
          <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
          <CardContent className="space-y-6 p-7">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#fecaca]">
                Admin dashboard
              </p>
              <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-white">
                Operare, scanari si risc
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/72">
                Ai intr-un singur loc volumul de bilete emise, scanarile de poarta,
                duplicatele si utilizatorii care trebuie verificati manual.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <QuickLink
                href="/admin/meciuri"
                label="Meciuri"
                description="Gestioneaza publicarea si limitele"
              />
              <QuickLink
                href="/admin/utilizatori"
                label="Utilizatori"
                description="Acorda acces la bilete"
              />
              <QuickLink
                href="/admin/abuz"
                label="Abuz"
                description="Vezi no-show si restrictii"
              />
              <QuickLink
                href="/admin/stadion/harta"
                label="Harta stadion"
                description="Configureaza overview SVG reutilizabil"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="grid gap-4 p-7 sm:grid-cols-2">
            <MetricCard icon={Ticket} label="Bilete emise" value={totalIssued} accent="red" />
            <MetricCard icon={ScanLine} label="Bilete scanate" value={totalScanned} accent="dark" />
            <MetricCard
              icon={AlertTriangle}
              label="Scanari duplicate"
              value={totalDuplicates}
              accent="light"
            />
            <MetricCard
              icon={Ban}
              label="Utilizatori suspecti"
              value={suspiciousUsers}
              accent="red"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                  Snapshot meciuri
                </h2>
                <p className="text-sm leading-6 text-neutral-600">
                  Volum operational pentru raportare, scanner si no-show.
                </p>
              </div>
              <Button
                asChild
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                <Link href="/admin/export?kind=tickets">Export CSV</Link>
              </Button>
            </div>

            <div className="grid gap-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="grid gap-4 rounded-[26px] border border-black/6 bg-neutral-50 p-4 lg:grid-cols-[1.4fr_repeat(4,0.7fr)_0.8fr] lg:items-center"
                >
                  <div>
                    <p className="font-semibold text-[#111111]">{match.title}</p>
                    <p className="text-sm text-neutral-500">{match.stadiumName}</p>
                  </div>
                  <NumberCell label="Emise" value={match.issuedCount} />
                  <NumberCell label="Scanate" value={match.scannedCount} />
                  <NumberCell label="No-show" value={match.noShowCount} />
                  <NumberCell label="Duplicate" value={match.duplicateScanAttempts} />
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
                  >
                    <Link href={`/admin/meciuri/${match.id}` as Route}>Raport</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                Sanatate operationala
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Indicatori rapizi pentru ce trebuie verificat imediat.
              </p>
            </div>

            <StatusLine
              icon={UsersRound}
              label="Utilizatori marcati"
              value={`${suspiciousUsers}`}
              tone={suspiciousUsers > 0 ? "red" : "neutral"}
            />
            <StatusLine
              icon={Ban}
              label="No-show cumulat"
              value={`${noShowCount}`}
              tone={noShowCount > 0 ? "red" : "neutral"}
            />
            <StatusLine
              icon={ScanLine}
              label="Rata validare"
              value={`${totalIssued ? Math.round((totalScanned / totalIssued) * 100) : 0}%`}
              tone="neutral"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Ticket;
  label: string;
  value: number;
  accent: "red" | "dark" | "light";
}) {
  const toneClass =
    accent === "red"
      ? "bg-[#dc2626] text-white"
      : accent === "dark"
        ? "bg-[#111111] text-white"
        : "bg-[#fff1f2] text-[#b91c1c]";

  return (
    <div className="rounded-[26px] border border-black/6 bg-neutral-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="mt-2 text-4xl font-semibold text-[#111111]">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function NumberCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#111111]">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[26px] border border-white/10 bg-white/6 p-4 transition hover:bg-white/10"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm leading-6 text-white/65">{description}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-white/45 transition group-hover:text-white" />
      </div>
    </Link>
  );
}

function StatusLine({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Ban;
  label: string;
  value: string;
  tone: "red" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
      : "border-black/6 bg-neutral-50 text-[#111111]";

  return (
    <div className={`flex items-center justify-between rounded-[26px] border p-4 ${toneClass}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80">
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
