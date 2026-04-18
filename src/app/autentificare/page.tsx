import { AuthPanel } from "@/components/auth-panel";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthPage() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
      <Card className="border-white/0 bg-[#08140f] text-white shadow-[0_24px_90px_-42px_rgba(8,20,15,0.8)]">
        <CardContent className="space-y-6 p-8">
          <span className="inline-flex rounded-full border border-[#d5a021]/30 bg-[#123826]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#f8d376]">
            Acces suporteri
          </span>
          <div className="space-y-4">
            <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.12em]">
              Intră, rezervă, scanează
            </h1>
            <p className="text-base leading-8 text-white/72">
              Contul tău este baza pentru rezervare, cabinet personal, PDF, partajare și
              istoricul de acces la stadion.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/72">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Limită implicită: 4 bilete / meci pentru suporteri
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              QR unic pentru fiecare loc și validare atomică la scanare
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              Resetare parolă și confirmare email prin Supabase Auth
            </div>
          </div>
        </CardContent>
      </Card>

      <AuthPanel />
    </section>
  );
}

