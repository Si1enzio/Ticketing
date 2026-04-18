import { connection } from "next/server";

import { createMatchAction } from "@/lib/actions/admin";
import { getAdminMatchOverview, getStadiumBuilderData } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminMatchesPage() {
  await connection();
  const [matches, stadiums] = await Promise.all([
    getAdminMatchOverview(),
    getStadiumBuilderData(),
  ]);

  const defaultStadium = stadiums[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
          Management meciuri
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
          Creează și publică meciuri
        </h1>
      </div>

      <Card className="border-[#e7dfbf] bg-white/95">
        <CardContent className="p-6">
          <form action={createMatchAction} className="grid gap-4 lg:grid-cols-3">
            <input type="hidden" name="stadiumId" value={defaultStadium?.id ?? ""} />
            <Field name="title" label="Titlu meci" />
            <Field name="slug" label="Slug" />
            <Field name="competitionName" label="Competiție" />
            <Field name="opponentName" label="Adversar" />
            <Field name="startsAt" label="Start" type="datetime-local" />
            <Field name="maxTicketsPerUser" label="Limită / user" type="number" defaultValue="4" />
            <Field name="reservationOpensAt" label="Deschidere rezervări" type="datetime-local" />
            <Field name="reservationClosesAt" label="Închidere rezervări" type="datetime-local" />
            <Field name="status" label="Status" defaultValue="published" />
            <label className="flex items-center gap-3 rounded-3xl border border-[#efe6c7] bg-[#fffdf6] px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" name="scannerEnabled" defaultChecked />
              Scanner activ pentru acest meci
            </label>
            <div className="flex items-end">
              <Button type="submit" className="w-full rounded-full bg-[#11552d] hover:bg-[#0e4524]">
                Creează meciul
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {matches.map((match) => (
          <Card key={match.id} className="border-[#e7dfbf] bg-white/95">
            <CardContent className="grid gap-3 p-5 lg:grid-cols-[1.2fr_repeat(4,0.6fr)] lg:items-center">
              <div>
                <p className="font-semibold text-[#08140f]">{match.title}</p>
                <p className="text-sm text-slate-500">{match.competitionName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
                <p className="mt-1 text-[#08140f]">{match.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Limită</p>
                <p className="mt-1 text-[#08140f]">{match.maxTicketsPerUser}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Emise</p>
                <p className="mt-1 text-[#08140f]">{match.issuedCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scanate</p>
                <p className="mt-1 text-[#08140f]">{match.scannedCount}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required className="rounded-2xl bg-[#fffdf6]" />
    </div>
  );
}
