import { connection } from "next/server";

import { AdminMatchCard } from "@/components/admin/admin-match-card";
import { AdminMatchDerivedFields } from "@/components/admin/admin-match-derived-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMatchAction } from "@/lib/actions/admin";
import {
  getAdminMatchOverview,
  getStadiumBuilderData,
  getTeamCatalog,
} from "@/lib/supabase/queries";

const matchStatusOptions = [
  { value: "draft", label: "Ciorna" },
  { value: "published", label: "Publicat" },
  { value: "closed", label: "Inchis" },
  { value: "completed", label: "Finalizat" },
  { value: "canceled", label: "Anulat" },
];

const ticketingModeOptions = [
  { value: "free", label: "Gratuit" },
  { value: "paid", label: "Cu plata" },
];

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const [matches, stadiums, teamCatalog] = await Promise.all([
    getAdminMatchOverview(),
    getStadiumBuilderData(),
    getTeamCatalog(),
  ]);

  const defaultStadium = stadiums[0];
  const defaultHomeTeam = "Organizator principal";
  const teamSuggestions = teamCatalog.map((team) => team.name);
  const stadiumOptions = stadiums.map((stadium) => ({
    value: stadium.id,
    label: stadium.name,
  }));

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
          Management evenimente
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Creeaza, editeaza si publica evenimente
        </h1>
      </div>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="p-6">
          <form action={createMatchAction} className="grid gap-4 lg:grid-cols-4">
            <SelectField
              name="stadiumId"
              label="Stadion"
              options={stadiumOptions}
              defaultValue={defaultStadium?.id}
            />
            <AdminMatchDerivedFields
              formId="match-create"
              defaultHomeTeam={defaultHomeTeam}
              defaultAwayTeam=""
              teamSuggestions={teamSuggestions}
            />
            <Field
              name="posterUrl"
              label="Poster / afis URL"
              placeholder="Recomandat: 1080x1350 px, raport 4:5"
              required={false}
            />
            <Field
              name="bannerUrl"
              label="Banner URL"
              placeholder="Recomandat: 1600x900 px, raport 16:9"
              required={false}
            />
            <Field name="competitionName" label="Competitie" />
            <Field name="maxTicketsPerUser" label="Limita / user" type="number" defaultValue="4" />
            <SelectField
              name="status"
              label="Status"
              options={matchStatusOptions}
              defaultValue="published"
            />
            <SelectField
              name="ticketingMode"
              label="Tip ticketing"
              options={ticketingModeOptions}
              defaultValue="free"
            />
            <Field
              name="ticketPriceLei"
              label="Pret (lei)"
              type="number"
              defaultValue="0"
              step="0.01"
              min="0"
            />
            <Field name="currency" label="Moneda" defaultValue="MDL" readOnly />
            <label className="flex items-center gap-3 rounded-[22px] border border-black/6 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 lg:col-span-2">
              <input type="checkbox" name="scannerEnabled" defaultChecked />
              Scanner activ pentru acest meci
            </label>
            <div className="flex items-end lg:col-span-2">
              <Button
                type="submit"
                className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Creeaza meciul
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {matches.map((match) => (
          <AdminMatchCard
            key={match.id}
            match={match}
            stadiumOptions={stadiumOptions}
            teamSuggestions={teamSuggestions}
            matchStatusOptions={matchStatusOptions}
            ticketingModeOptions={ticketingModeOptions}
          />
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
  step,
  min,
  placeholder,
  readOnly = false,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  step?: string;
  min?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        min={min}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
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
