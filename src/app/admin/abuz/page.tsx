import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminUsersOverview } from "@/lib/supabase/queries";

export default async function AdminAbusePage() {
  const users = await getAdminUsersOverview();
  const suspiciousUsers = users.filter(
    (user) => user.abuseScore >= 30 || user.noShowRatio >= 0.5,
  );

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
            Abuse analytics
          </p>
          <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
            Utilizatori flag-uiți
          </h1>
        </div>
        <Button asChild className="rounded-full bg-[#11552d] hover:bg-[#0e4524]">
          <Link href="/admin/export?kind=abuse">Export CSV abuz</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {suspiciousUsers.map((user) => (
          <Card key={user.userId} className="border-[#e7dfbf] bg-white/95">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_repeat(4,0.5fr)] md:items-center">
              <div>
                <p className="font-semibold text-[#08140f]">{user.fullName ?? user.email}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <Metric title="Score" value={user.abuseScore} />
              <Metric title="Rezervate" value={user.totalReserved} />
              <Metric title="Scanate" value={user.totalScanned} />
              <Metric title="No-show" value={`${Math.round(user.noShowRatio * 100)}%`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-[#08140f]">{value}</p>
    </div>
  );
}
