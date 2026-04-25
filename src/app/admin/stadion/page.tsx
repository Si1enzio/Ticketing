/* eslint-disable @next/next/no-img-element */
import { connection } from "next/server";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";

import {
  createSponsorAction,
  createSectorAction,
  createStadiumAction,
  createStandAction,
  deleteStandAction,
  updateSponsorAction,
  updateStadiumAction,
  updateStandAction,
} from "@/lib/actions/admin";
import { getOrganizerOptions, getStadiumBuilderData } from "@/lib/supabase/queries";
import { StadiumAdminSectorCard } from "@/components/stadium/stadium-admin-sector-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminStadiumPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const [stadiums, organizers] = await Promise.all([
    getStadiumBuilderData(),
    getOrganizerOptions(),
  ]);
  const defaultStadium = stadiums[0];

  return (
    <div className="grid gap-8">
      {resolvedSearchParams.error ? (
        <Alert
          variant="destructive"
          className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] px-5 py-4 text-[#b91c1c]"
        >
          <AlertTitle className="text-base font-semibold">Stergerea a fost blocata</AlertTitle>
          <AlertDescription className="text-sm text-[#b91c1c]">
            {resolvedSearchParams.error}
          </AlertDescription>
        </Alert>
      ) : null}

      {resolvedSearchParams.notice ? (
        <Alert className="rounded-[24px] border border-[#d1fae5] bg-[#ecfdf5] px-5 py-4 text-[#166534]">
          <AlertTitle className="text-base font-semibold">Operatiune reusita</AlertTitle>
          <AlertDescription className="text-sm text-[#166534]">
            {resolvedSearchParams.notice}
          </AlertDescription>
        </Alert>
      ) : null}

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Builder locatii
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Locatii, tribune, sectoare si locuri
        </h1>
        <div className="mt-4">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
          >
            <Link href="/admin/stadion/harta">Deschide builderul pentru harta SVG</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Adauga locatie
            </h2>
            <form action={createStadiumAction} className="grid gap-4">
              <Field name="name" label="Nume locatie" />
              <Field name="slug" label="Slug" />
              <Field name="city" label="Localitate" />
              <SelectField
                name="organizerId"
                label="Organizator / gazda"
                allowEmpty
                emptyLabel="Fara organizator selectat"
                options={organizers.map((organizer) => ({
                  value: organizer.id,
                  label: organizer.name,
                }))}
              />
              <Button
                type="submit"
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Salveaza locatia
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
          <CardContent className="space-y-4 p-6">
            <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
              Creeaza tribuna
            </h2>
            <form action={createStandAction} className="grid gap-4">
              <SelectField
                name="stadiumId"
                label="Locatie"
                options={stadiums.map((stadium) => ({
                  value: stadium.id,
                  label: stadium.name,
                }))}
                defaultValue={defaultStadium?.id}
              />
              <Field name="name" label="Nume tribuna" />
              <Field name="code" label="Cod" />
              <Field name="color" label="Culoare" defaultValue="#111111" />
              <Button
                type="submit"
                className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
              >
                Adauga tribuna
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
            <form action={createSectorAction} className="grid gap-4">
              <SelectField
                name="stadiumId"
                label="Locatie"
                options={stadiums.map((stadium) => ({
                  value: stadium.id,
                  label: stadium.name,
                }))}
                defaultValue={defaultStadium?.id}
              />
              <SelectField
                name="standId"
                label="Tribuna"
                allowEmpty
                emptyLabel="Fara tribuna"
                options={stadiums.flatMap((stadium) =>
                  stadium.stands.map((stand) => ({
                    value: stand.id,
                    label: `${stadium.name} - ${stand.name} (${stand.code})`,
                  })),
                )}
              />
              <SelectField
                name="gateId"
                label="Poarta implicita"
                allowEmpty
                emptyLabel="Fara poarta alocata"
                options={stadiums.flatMap((stadium) =>
                  stadium.gates
                    .filter((gate) => gate.isActive)
                    .map((gate) => ({
                      value: gate.id,
                      label: `${stadium.name} - ${gate.name} (${gate.code})`,
                    })),
                )}
              />
              <Field name="name" label="Nume sector" />
              <Field name="code" label="Cod" />
              <Field name="color" label="Culoare" defaultValue="#dc2626" />
              <Field name="rowsCount" label="Numar randuri" type="number" defaultValue="6" />
              <Field name="seatsPerRow" label="Locuri / rand" type="number" defaultValue="12" />
              <Button
                type="submit"
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Creeaza sector si genereaza locuri
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {stadiums.map((stadium) => {
        const unassignedSectors = stadium.sectors.filter((sector) => !sector.standId);
        const totalSeats = stadium.sectors.reduce(
          (sum, sector) => sum + sector.seats.length,
          0,
        );

        return (
          <details
            key={stadium.id}
            className="surface-panel group overflow-hidden rounded-[30px] border border-white/70 bg-white/94"
          >
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
            <summary className="list-none cursor-pointer p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-4xl uppercase tracking-[0.08em] text-[#111111]">
                    {stadium.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600">
                    <span>{stadium.city}</span>
                    <span>{stadium.stands.length} tribune</span>
                    <span>{stadium.sectors.length} sectoare</span>
                    <span>{totalSeats} locuri</span>
                    {stadium.organizerName ? <span>Organizator: {stadium.organizerName}</span> : null}
                  </div>
                  <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-500">
                    Vezi detalii pentru a edita locatia, sponsorii, tribunele si sectoarele.
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#111111]">
                  Detalii
                  <ChevronDownIcon className="size-4 transition group-open:rotate-180" />
                </span>
              </div>
            </summary>

            <CardContent className="space-y-6 border-t border-black/6 p-6">
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <p className="text-sm leading-6 text-neutral-600">
                    Acum poti structura locatia pe tribune, iar in interiorul lor pe
                    sectoare. Fiecare sector isi pastreaza randurile si editorul complet de
                    locuri.
                  </p>
                  {stadium.organizerName ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Organizator: {stadium.organizerName}
                    </p>
                  ) : null}
                </div>

                <form action={updateStadiumAction} className="grid gap-4 md:grid-cols-3">
                  <input type="hidden" name="stadiumId" value={stadium.id} />
                  <Field
                    name={`stadium-name-${stadium.id}`}
                    htmlName="name"
                    label="Nume locatie"
                    defaultValue={stadium.name}
                  />
                  <Field
                    name={`stadium-slug-${stadium.id}`}
                    htmlName="slug"
                    label="Slug"
                    defaultValue={stadium.slug}
                  />
                  <Field
                    name={`stadium-city-${stadium.id}`}
                    htmlName="city"
                    label="Localitate"
                    defaultValue={stadium.city}
                  />
                  <SelectField
                    name={`stadium-organizer-${stadium.id}`}
                    htmlName="organizerId"
                    label="Organizator / gazda"
                    allowEmpty
                    emptyLabel="Fara organizator selectat"
                    options={organizers.map((organizer) => ({
                      value: organizer.id,
                      label: organizer.name,
                    }))}
                    defaultValue={stadium.organizerId ?? undefined}
                  />
                  <div className="md:col-span-3">
                    <Button
                      type="submit"
                      className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                    >
                      Salveaza locatia existenta
                    </Button>
                  </div>
                </form>
              </div>

              <div className="grid gap-5 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
                <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <p className="font-semibold text-[#111111]">Sponsorii clubului gazda</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      Logo-urile adaugate aici pot fi afisate pe biletul PDF. Foloseste
                      linkuri publice catre imagini sau URL-uri dintr-un bucket public.
                    </p>
                  </div>

                  <form action={createSponsorAction} className="grid gap-4 md:grid-cols-4">
                    <input type="hidden" name="stadiumId" value={stadium.id} />
                    <Field
                      name={`sponsor-name-new-${stadium.id}`}
                      htmlName="name"
                      label="Nume sponsor"
                    />
                    <Field
                      name={`sponsor-logo-new-${stadium.id}`}
                      htmlName="logoUrl"
                      label="Logo URL"
                      type="url"
                    />
                    <Field
                      name={`sponsor-site-new-${stadium.id}`}
                      htmlName="websiteUrl"
                      label="Website"
                      type="url"
                      required={false}
                    />
                    <div className="grid gap-2">
                      <Field
                        name={`sponsor-order-new-${stadium.id}`}
                        htmlName="sortOrder"
                        label="Ordine"
                        type="number"
                        defaultValue="0"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <Button
                        type="submit"
                        className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                      >
                        Adauga sponsor
                      </Button>
                    </div>
                  </form>
                </div>

                {stadium.sponsors.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {stadium.sponsors.map((sponsor) => (
                      <form
                        key={sponsor.id}
                        action={updateSponsorAction}
                        className="grid gap-4 rounded-[24px] border border-black/6 bg-white p-4"
                      >
                        <input type="hidden" name="sponsorId" value={sponsor.id} />
                        <input type="hidden" name="stadiumId" value={stadium.id} />
                        <div className="flex items-center gap-3">
                          <img
                            src={sponsor.logoUrl}
                            alt={sponsor.name}
                            className="h-12 w-20 rounded-xl border border-black/8 bg-white object-contain p-2"
                          />
                          <div>
                            <p className="font-semibold text-[#111111]">{sponsor.name}</p>
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                              Ordine {sponsor.sortOrder}
                            </p>
                          </div>
                        </div>
                        <Field
                          name={`sponsor-name-${sponsor.id}`}
                          htmlName="name"
                          label="Nume sponsor"
                          defaultValue={sponsor.name}
                        />
                        <Field
                          name={`sponsor-logo-${sponsor.id}`}
                          htmlName="logoUrl"
                          label="Logo URL"
                          type="url"
                          defaultValue={sponsor.logoUrl}
                        />
                        <Field
                          name={`sponsor-site-${sponsor.id}`}
                          htmlName="websiteUrl"
                          label="Website"
                          type="url"
                          defaultValue={sponsor.websiteUrl ?? ""}
                          required={false}
                        />
                        <Field
                          name={`sponsor-order-${sponsor.id}`}
                          htmlName="sortOrder"
                          label="Ordine"
                          type="number"
                          defaultValue={String(sponsor.sortOrder)}
                        />
                        <Button
                          type="submit"
                          className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                        >
                          Salveaza sponsorul
                        </Button>
                      </form>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Nu exista inca sponsori configurati pentru aceasta locatie.
                  </p>
                )}
              </div>

              <div className="grid gap-6">
                {stadium.stands.map((stand) => {
                  const standSectors = stadium.sectors.filter(
                    (sector) => sector.standId === stand.id,
                  );

                  return (
                    <div
                      key={stand.id}
                      className="grid gap-5 rounded-[28px] border border-black/6 bg-neutral-50 p-5"
                    >
                      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr_auto]">
                        <div>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: stand.color }}
                            />
                            <div>
                              <p className="font-semibold text-[#111111]">{stand.name}</p>
                              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                                {stand.code} - {standSectors.length} sectoare
                              </p>
                            </div>
                          </div>
                        </div>

                        <form action={updateStandAction} className="grid gap-4 md:grid-cols-4">
                          <input type="hidden" name="standId" value={stand.id} />
                          <input type="hidden" name="stadiumId" value={stadium.id} />
                          <Field
                            name={`stand-name-${stand.id}`}
                            htmlName="name"
                            label="Nume tribuna"
                            defaultValue={stand.name}
                          />
                          <Field
                            name={`stand-code-${stand.id}`}
                            htmlName="code"
                            label="Cod"
                            defaultValue={stand.code}
                          />
                          <Field
                            name={`stand-color-${stand.id}`}
                            htmlName="color"
                            label="Culoare"
                            defaultValue={stand.color}
                          />
                          <div className="flex items-end">
                            <Button
                              type="submit"
                              className="w-full rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                            >
                              Salveaza tribuna
                            </Button>
                          </div>
                        </form>

                        <form action={deleteStandAction} className="flex items-end">
                          <input type="hidden" name="standId" value={stand.id} />
                          <Button
                            type="submit"
                            variant="destructive"
                            className="rounded-full border border-[#b91c1c] bg-[#fff1f2] px-5 text-[#b91c1c] hover:bg-[#ffe4e6]"
                          >
                            Sterge tribuna
                          </Button>
                        </form>
                      </div>

                      <div className="grid gap-5">
                        {standSectors.map((sector) => (
                          <StadiumAdminSectorCard
                            key={sector.id}
                            sector={sector}
                            stadiumId={stadium.id}
                            standOptions={stadium.stands.map((item) => ({
                              value: item.id,
                              label: `${item.name} (${item.code})`,
                            }))}
                            gateOptions={stadium.gates
                              .filter((gate) => gate.isActive)
                              .map((gate) => ({
                                value: gate.id,
                                label: `${gate.name} (${gate.code})`,
                              }))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {unassignedSectors.length ? (
                  <div className="grid gap-5 rounded-[28px] border border-dashed border-black/10 bg-white/75 p-5">
                    <div>
                      <p className="font-semibold text-[#111111]">Sectoare fara tribuna</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Le poti lasa independente sau le poti muta intr-o tribuna existenta.
                      </p>
                    </div>

                    <div className="grid gap-5">
                      {unassignedSectors.map((sector) => (
                        <StadiumAdminSectorCard
                          key={sector.id}
                          sector={sector}
                          stadiumId={stadium.id}
                          standOptions={stadium.stands.map((item) => ({
                            value: item.id,
                            label: `${item.name} (${item.code})`,
                          }))}
                          gateOptions={stadium.gates
                            .filter((gate) => gate.isActive)
                            .map((gate) => ({
                              value: gate.id,
                              label: `${gate.name} (${gate.code})`,
                            }))}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </details>
        );
      })}
    </div>
  );
}

function Field({
  name,
  htmlName,
  label,
  type = "text",
  defaultValue,
  required = true,
}: {
  name: string;
  htmlName?: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={htmlName ?? name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded-2xl bg-white"
      />
    </div>
  );
}

function SelectField({
  name,
  htmlName,
  label,
  options,
  defaultValue,
  allowEmpty = false,
  emptyLabel = "Selecteaza",
}: {
  name: string;
  htmlName?: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={htmlName ?? name}
        defaultValue={defaultValue}
        className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
