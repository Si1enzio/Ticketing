import { connection } from "next/server";

import { ScannerConsole } from "@/components/scanner-console";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/auth/roles";
import { getScannerMatches, getViewerContext } from "@/lib/supabase/queries";

export default async function ScannerPage() {
  await connection();
  const viewer = await getViewerContext();
  const matches = await getScannerMatches();

  if (!hasAnyRole(viewer.roles, ["steward", "admin", "superadmin"])) {
    return (
      <section className="mx-auto flex w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full border-[#d5a021]/15 bg-white/95">
          <CardContent className="space-y-4 p-8">
            <h1 className="font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
              Acces restricționat
            </h1>
            <p className="text-sm leading-7 text-slate-600">
              Scannerul este disponibil doar pentru rolurile steward, admin sau
              superadmin. Dacă trebuie să validezi bilete, solicită rolul corect în
              Supabase.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
          Matchday tools
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
          Steward scanner
        </h1>
      </div>

      <ScannerConsole matches={matches} />
    </section>
  );
}
