import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/auth/roles";
import { getServerI18n } from "@/lib/i18n/server";
import { getScannerMatches, getViewerContext } from "@/lib/supabase/queries";

export default async function ScannerPage() {
  await connection();
  const viewer = await getViewerContext();
  const matches = await getScannerMatches();
  const { messages } = await getServerI18n();

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

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          {messages.scanner.badge}
        </p>
        <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          {messages.scanner.title}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-neutral-600">
          Alege meciul pe care il scanezi la poarta. Dupa ce intri in scannerul unui
          meci, refresh-ul ramane pe acelasi meci si nu mai trebuie sa cauti din nou in
          lista.
        </p>
      </div>

      {matches.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/scanner/${match.id}`}
              className="group block rounded-[30px] border border-black/8 bg-white/94 p-0 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-[#dc2626]/18 hover:shadow-[0_28px_70px_-40px_rgba(220,38,38,0.32)]"
            >
              <div className="h-1.5 rounded-t-[30px] bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
              <div className="flex flex-col gap-5 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b91c1c]">
                      {match.competitionName}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight text-[#111111]">
                      {match.title}
                    </h2>
                  </div>
                  <div className="rounded-full border border-[#dc2626]/14 bg-[#fff1f2] p-3 text-[#b91c1c]">
                    <ScanLine className="h-5 w-5" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-black/8 bg-neutral-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                      Stadion
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#111111]">
                      {match.stadiumName}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-black/8 bg-neutral-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                      Program
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#111111]">
                      {new Date(match.startsAt).toLocaleString("ro-RO")}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center text-sm font-semibold text-[#b91c1c]">
                  Deschide scannerul pentru acest meci
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="surface-panel rounded-[30px] border border-white/70 bg-white/94">
          <CardContent className="space-y-3 p-8">
            <h2 className="text-2xl font-semibold text-[#111111]">
              Nu exista inca meciuri disponibile pentru scanner
            </h2>
            <p className="text-sm leading-7 text-neutral-600">
              Verifica daca scannerul este activ pentru meciul dorit si daca meciul este
              publicat. Dupa activare, el va aparea automat in lista de mai sus.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
