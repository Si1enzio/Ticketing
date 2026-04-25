import { connection } from "next/server";

import {
  createOrganizerAction,
  updateOrganizerAction,
} from "@/lib/actions/admin";
import { getOrganizerOptions } from "@/lib/supabase/queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const organizerCategoryOptions = [
  { value: "club", label: "Club / gazda" },
  { value: "promoter", label: "Promoter" },
  { value: "institution", label: "Institutie" },
  { value: "venue-operator", label: "Operator locatie" },
] as const;

export default async function AdminOrganizersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const organizers = await getOrganizerOptions();

  return (
    <div className="grid gap-8">
      {resolvedSearchParams.error ? (
        <Alert
          variant="destructive"
          className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] px-5 py-4 text-[#b91c1c]"
        >
          <AlertTitle className="text-base font-semibold">Operatiunea a fost blocata</AlertTitle>
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
          Management organizatori
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Cluburi, gazde si operatori
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
          Defineste organizatorii sau gazdele evenimentelor. O locatie poate fi legata de
          un organizator, iar stewardii sau administratorii operationali pot fi limitati
          ulterior doar la acel organizator sau la o locatie specifica.
        </p>
      </div>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#0B1A33_45%,#C9A24F_100%)]" />
        <CardContent className="p-6">
          <form action={createOrganizerAction} className="grid gap-4 lg:grid-cols-4">
            <Field name="name" label="Nume organizator" />
            <Field name="slug" label="Slug" />
            <SelectField
              name="category"
              label="Tip"
              options={organizerCategoryOptions}
              defaultValue="club"
            />
            <Field
              name="logoUrl"
              label="Logo URL"
              type="url"
              required={false}
              placeholder="https://..."
            />
            <TextAreaField
              name="description"
              label="Descriere"
              className="lg:col-span-4"
              placeholder="Detalii utile despre organizator / club / operator"
            />
            <div className="lg:col-span-4">
              <Button
                type="submit"
                className="rounded-full border border-[#0B1A33] bg-[#0B1A33] text-white hover:bg-[#081224]"
              >
                Creeaza organizator
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {organizers.map((organizer) => (
          <Card
            key={organizer.id}
            className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94"
          >
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#0B1A33_45%,#C9A24F_100%)]" />
            <CardContent className="p-6">
              <form action={updateOrganizerAction} className="grid gap-4 lg:grid-cols-4">
                <input type="hidden" name="organizerId" value={organizer.id} />
                <Field name={`name-${organizer.id}`} htmlName="name" label="Nume organizator" defaultValue={organizer.name} />
                <Field name={`slug-${organizer.id}`} htmlName="slug" label="Slug" defaultValue={organizer.slug} />
                <SelectField
                  name={`category-${organizer.id}`}
                  htmlName="category"
                  label="Tip"
                  options={organizerCategoryOptions}
                  defaultValue={organizer.category}
                />
                <Field
                  name={`logo-${organizer.id}`}
                  htmlName="logoUrl"
                  label="Logo URL"
                  type="url"
                  required={false}
                  defaultValue={organizer.logoUrl ?? ""}
                />
                <TextAreaField
                  name={`description-${organizer.id}`}
                  htmlName="description"
                  label="Descriere"
                  className="lg:col-span-4"
                  defaultValue={organizer.description ?? ""}
                />
                <div className="lg:col-span-4">
                  <Button
                    type="submit"
                    className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                  >
                    Salveaza organizatorul
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  name,
  htmlName,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required = true,
}: {
  name: string;
  htmlName?: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        required={required}
        className="rounded-2xl bg-white"
      />
    </div>
  );
}

function TextAreaField({
  name,
  htmlName,
  label,
  className,
  placeholder,
  defaultValue,
}: {
  name: string;
  htmlName?: string;
  label: string;
  className?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className={className}>
      <div className="grid gap-2">
        <Label htmlFor={name}>{label}</Label>
        <textarea
          id={name}
          name={htmlName ?? name}
          rows={4}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="min-h-[132px] rounded-[22px] border border-black/8 bg-white px-4 py-3 text-sm text-[#111111] outline-none focus:border-[#0B1A33]"
        />
      </div>
    </div>
  );
}

function SelectField({
  name,
  htmlName,
  label,
  options,
  defaultValue,
}: {
  name: string;
  htmlName?: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={htmlName ?? name}
        defaultValue={defaultValue}
        className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#0B1A33]"
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
