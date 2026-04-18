import { createSectorAction, createStadiumAction } from "@/lib/actions/admin";
import { getStadiumBuilderData } from "@/lib/supabase/queries";
import { SeatFlagEditor } from "@/components/seat-flag-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminStadiumPage() {
  const stadiums = await getStadiumBuilderData();
  const defaultStadium = stadiums[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7c5b0b]">
          Stadium builder
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
          Sectoare, rânduri și locuri
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#e7dfbf] bg-white/95">
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
              Adaugă stadion
            </h2>
            <form action={createStadiumAction} className="grid gap-4">
              <Field name="name" label="Nume stadion" />
              <Field name="slug" label="Slug" />
              <Field name="city" label="Oraș" />
              <Button type="submit" className="rounded-full bg-[#11552d] hover:bg-[#0e4524]">
                Salvează stadionul
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-[#e7dfbf] bg-white/95">
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
              Creează sector
            </h2>
            <form action={createSectorAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="stadiumId" value={defaultStadium?.id ?? ""} />
              <Field name="name" label="Nume sector" />
              <Field name="code" label="Cod" />
              <Field name="color" label="Culoare" defaultValue="#11552d" />
              <Field name="rowsCount" label="Număr rânduri" type="number" defaultValue="6" />
              <Field name="seatsPerRow" label="Locuri / rând" type="number" defaultValue="12" />
              <div className="md:col-span-2">
                <Button type="submit" className="w-full rounded-full bg-[#11552d] hover:bg-[#0e4524]">
                  Creează sector și generează locuri
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {stadiums.map((stadium) => (
        <Card key={stadium.id} className="border-[#e7dfbf] bg-white/95">
          <CardContent className="space-y-6 p-6">
            <div>
              <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
                {stadium.name}
              </h2>
              <p className="text-sm text-slate-500">{stadium.city}</p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              {stadium.sectors.map((sector) => (
                <div key={sector.id} className="rounded-3xl border border-[#efe6c7] bg-[#fffdf6] p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: sector.color }} />
                    <div>
                      <p className="font-semibold text-[#08140f]">{sector.name}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {sector.code} • {sector.rowsCount} rânduri • {sector.seatsPerRow} locuri/rând
                      </p>
                    </div>
                  </div>
                  <SeatFlagEditor seats={sector.seats.slice(0, 18)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
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

