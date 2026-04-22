import { connection } from "next/server";
import { notFound } from "next/navigation";

import { ScannerConsole } from "@/components/scanner-console";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/auth/roles";
import { getServerI18n } from "@/lib/i18n/server";
import { getScannerMatches, getViewerContext } from "@/lib/supabase/queries";

export default async function MatchScannerPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  await connection();
  const [{ matchId }, viewer, matches, { messages }] = await Promise.all([
    params,
    getViewerContext(),
    getScannerMatches(),
    getServerI18n(),
  ]);

  if (!hasAnyRole(viewer.roles, ["steward", "admin", "superadmin"])) {
    return (
      <section className="mx-auto flex w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="surface-panel w-full rounded-[30px] border border-white/70 bg-white/94">
          <CardContent className="space-y-4 p-8">
            <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
              {messages.scanner.restrictedTitle}
            </h1>
            <p className="text-sm leading-7 text-neutral-600">
              {messages.scanner.restrictedDescription}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const match = matches.find((item) => item.id === matchId);

  if (!match) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          {messages.scanner.badge}
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          {messages.scanner.title}
        </h1>
      </div>

      <ScannerConsole match={match} backHref="/scanner" />
    </section>
  );
}
