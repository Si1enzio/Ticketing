import { AuthPanel } from "@/components/auth-panel";
import { Card, CardContent } from "@/components/ui/card";

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath =
    resolvedSearchParams.next && resolvedSearchParams.next.startsWith("/")
      ? resolvedSearchParams.next
      : "/cabinet";

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <Card className="surface-dark overflow-hidden rounded-[32px] border border-black/8 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.26),transparent_28%),linear-gradient(180deg,#171717_0%,#101010_100%)]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#fca5a5_36%,#ef4444_100%)]" />
        <CardContent className="space-y-6 p-8">
          <span className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#fca5a5]">
            Acces suporteri
          </span>
          <div className="space-y-4">
            <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.12em] text-white">
              Intra. Solicita. Acceseaza.
            </h1>
            <p className="text-base leading-8 text-white/72">
              Contul tau este baza pentru cabinetul personal, biletele emise sau
              procurate, PDF, partajare si istoricul de acces la stadion.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/72">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Accesul la solicitarea biletelor poate fi acordat de admin per utilizator
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              QR unic pentru fiecare loc si validare atomica la scanare
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Resetare parola si confirmare email prin Supabase Auth
            </div>
          </div>
        </CardContent>
      </Card>

      <AuthPanel nextPath={nextPath} />
    </section>
  );
}
