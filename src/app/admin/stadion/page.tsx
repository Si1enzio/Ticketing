import { connection } from "next/server";

import {
  createSectorAction,
  createStadiumAction,
  updateSectorAction,
  updateStadiumAction,
} from "@/lib/actions/admin";
import { getStadiumBuilderData } from "@/lib/supabase/queries";
import { SeatFlagEditor } from "@/components/seat-flag-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminStadiumPage() {
  await connection();
  const stadiums = await getStadiumBuilderData();
  const defaultStadium = stadiums[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Stadium builder
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Sectoare, randuri si locuri
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Adauga stadion
            </h2>
            <form action={createStadiumAction} className="grid gap-4">
              <Field name="name" label="Nume stadion" />
              <Field name="slug" label="Slug" />
              <Field name="city" label="Oras" />
              <Button
                type="submit"
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Salveaza stadionul
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Creeaza sector
            </h2>
            <form action={createSectorAction} className="grid gap-4 md:grid-cols-2">
              <SelectField
                name="stadiumId"
                label="Stadion"
                options={stadiums.map((stadium) => ({
                  value: stadium.id,
                  label: stadium.name,
                }))}
                defaultValue={defaultStadium?.id}
              />
              <Field name="name" label="Nume sector" />
              <Field name="code" label="Cod" />
              <Field name="color" label="Culoare" defaultValue="#dc2626" />
              <Field name="rowsCount" label="Numar randuri" type="number" defaultValue="6" />
              <Field name="seatsPerRow" label="Locuri / rand" type="number" defaultValue="12" />
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  className="w-full rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                >
                  Creeaza sector si genereaza locurile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {stadiums.map((stadium) => (
        <Card
          key={stadium.id}
          className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94"
        >
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                  {stadium.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Editezi datele stadionului, apoi gestionezi sectoarele si toate locurile
                  disponibile din structura existenta.
                </p>
              </div>

              <form action={updateStadiumAction} className="grid gap-4 md:grid-cols-3">
                <input type="hidden" name="stadiumId" value={stadium.id} />
                <Field name={`stadium-name-${stadium.id}`} htmlName="name" label="Nume stadion" defaultValue={stadium.name} />
                <Field name={`stadium-slug-${stadium.id}`} htmlName="slug" label="Slug" defaultValue={stadium.slug} />
                <Field name={`stadium-city-${stadium.id}`} htmlName="city" label="Oras" defaultValue={stadium.city} />
                <div className="md:col-span-3">
                  <Button
                    type="submit"
                    className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                  >
                    Salveaza stadionul existent
                  </Button>
                </div>
              </form>
            </div>

            <div className="grid gap-6">
              {stadium.sectors.map((sector) => (
                <div
                  key={sector.id}
                  className="grid gap-5 rounded-[28px] border border-black/6 bg-neutral-50 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: sector.color }} />
                    <div>
                      <p className="font-semibold text-[#111111]">{sector.name}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        {sector.code} - {sector.rowsCount} randuri - {sector.seatsPerRow} locuri/rand
                      </p>
                    </div>
                  </div>

                  <form action={updateSectorAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <input type="hidden" name="sectorId" value={sector.id} />
                    <input type="hidden" name="stadiumId" value={stadium.id} />
                    <Field
                      name={`sector-name-${sector.id}`}
                      htmlName="name"
                      label="Nume sector"
                      defaultValue={sector.name}
                    />
                    <Field
                      name={`sector-code-${sector.id}`}
                      htmlName="code"
                      label="Cod"
                      defaultValue={sector.code}
                    />
                    <Field
                      name={`sector-color-${sector.id}`}
                      htmlName="color"
                      label="Culoare"
                      defaultValue={sector.color}
                    />
                    <Field
                      name={`sector-rows-${sector.id}`}
                      htmlName="rowsCount"
                      label="Numar randuri"
                      type="number"
                      defaultValue={String(sector.rowsCount)}
                    />
                    <Field
                      name={`sector-seats-${sector.id}`}
                      htmlName="seatsPerRow"
                      label="Locuri / rand"
                      type="number"
                      defaultValue={String(sector.seatsPerRow)}
                    />
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                      >
                        Salveaza sectorul
                      </Button>
                    </div>
                  </form>

                  <div className="rounded-[24px] border border-dashed border-black/10 bg-white/70 p-4">
                    <SeatFlagEditor seats={sector.seats} sectorName={sector.name} />
                  </div>
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
  htmlName,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  htmlName?: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={htmlName ?? name}
        type={type}
        defaultValue={defaultValue}
        required
        className="rounded-2xl bg-white"
      />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
