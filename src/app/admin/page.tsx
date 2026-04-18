import Link from "next/link";
import { AlertTriangle, Ban, ScanLine, Ticket } from "lucide-react";
import { connection } from "next/server";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
          Admin dashboard
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
          Operare, scanări și risc
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Ticket} label="Bilete emise" value={totalIssued} />
        <MetricCard icon={ScanLine} label="Bilete scanate" value={totalScanned} />
        <MetricCard
          icon={AlertTriangle}
          label="Scanări duplicate"
          value={totalDuplicates}
        />
        <MetricCard icon={Ban} label="Utilizatori suspectați" value={suspiciousUsers} />
      </div>

      <Card className="border-[#e7dfbf] bg-white/95">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
                Meciuri și ticketing
              </h2>
              <p className="text-sm text-slate-600">
                Snapshot operațional pentru rapoarte, no-show și volum scanner.
              </p>
            </div>
            <Button asChild className="rounded-full bg-[#11552d] hover:bg-[#0e4524]">
              <Link href="/admin/export?kind=tickets">Export CSV</Link>
            </Button>
          </div>

          <div className="grid gap-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="grid gap-3 rounded-3xl border border-[#efe6c7] bg-[#fffdf6] p-4 md:grid-cols-[1.3fr_repeat(4,0.7fr)] md:items-center"
              >
                <div>
                  <p className="font-semibold text-[#08140f]">{match.title}</p>
                  <p className="text-sm text-slate-500">{match.stadiumName}</p>
                </div>
                <NumberCell label="Emise" value={match.issuedCount} />
                <NumberCell label="Scanate" value={match.scannedCount} />
                <NumberCell label="No-show" value={match.noShowCount} />
                <NumberCell label="Duplicate" value={match.duplicateScanAttempts} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-[#e7dfbf] bg-white/95">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-4xl font-semibold text-[#08140f]">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123826] text-[#f8d376]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function NumberCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#08140f]">{value}</p>
    </div>
  );
}
