import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AdminMatchDerivedFields } from "@/components/admin/admin-match-derived-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMatchAction, deleteMatchAction, updateMatchAction } from "@/lib/actions/admin";
import {
  getAdminMatchOverview,
  getStadiumBuilderData,
  getTeamCatalog,
} from "@/lib/supabase/queries";

const matchStatusOptions = [
  { value: "draft", label: "Ciornă" },
  { value: "published", label: "Publicat" },
  { value: "closed", label: "Închis" },
  { value: "completed", label: "Finalizat" },
  { value: "canceled", label: "Anulat" },
];

const ticketingModeOptions = [
  { value: "free", label: "Gratuit" },
  { value: "paid", label: "Cu plată" },
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
  const defaultHomeTeam = "FC Milsami Orhei";
  const teamSuggestions = teamCatalog.map((team) => team.name);

  return (
    <div className="grid gap-8">
      {resolvedSearchParams.error ? (
        <Alert
          variant="destructive"
          className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] px-5 py-4 text-[#b91c1c]"
        >
          <AlertTitle className="text-base font-semibold">Operațiunea a fost blocată</AlertTitle>
          <AlertDescription className="text-sm text-[#b91c1c]">
            {resolvedSearchParams.error}
          </AlertDescription>
        </Alert>
      ) : null}

      {resolvedSearchParams.notice ? (
        <Alert className="rounded-[24px] border border-[#d1fae5] bg-[#ecfdf5] px-5 py-4 text-[#166534]">
          <AlertTitle className="text-base font-semibold">Operațiune reușită</AlertTitle>
          <AlertDescription className="text-sm text-[#166534]">
            {resolvedSearchParams.notice}
          </AlertDescription>
        </Alert>
      ) : null}

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Management meciuri
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Creează, editează și publică meciuri
        </h1>
      </div>

      <Card className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
        <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
        <CardContent className="p-6">
          <form action={createMatchAction} className="grid gap-4 lg:grid-cols-4">
            <SelectField
              name="stadiumId"
              label="Stadion"
              options={stadiums.map((stadium) => ({
                value: stadium.id,
                label: stadium.name,
              }))}
              defaultValue={defaultStadium?.id}
            />
            <AdminMatchDerivedFields
              formId="match-create"
              defaultHomeTeam={defaultHomeTeam}
              defaultAwayTeam=""
              teamSuggestions={teamSuggestions}
            />
            <Field name="competitionName" label="Competiție" />
            <Field name="maxTicketsPerUser" label="Limită / user" type="number" defaultValue="4" />
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
            <Field name="ticketPriceCents" label="Preț (bani)" type="number" defaultValue="0" />
            <Field name="currency" label="Monedă" defaultValue="MDL" />
            <label className="flex items-center gap-3 rounded-[22px] border border-black/6 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 lg:col-span-2">
              <input type="checkbox" name="scannerEnabled" defaultChecked />
              Scanner activ pentru acest meci
            </label>
            <div className="flex items-end lg:col-span-2">
              <Button
                type="submit"
                className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Creează meciul
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {matches.map((match) => (
          <Card
            key={match.id}
            className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94"
          >
            <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
            <CardContent className="grid gap-5 p-5">
              <div className="grid gap-3 lg:grid-cols-[1.15fr_repeat(5,0.56fr)_0.7fr] lg:items-center">
                <div>
                  <p className="font-semibold text-[#111111]">{match.title}</p>
                  <p className="text-sm text-neutral-500">{match.competitionName}</p>
                </div>
                <NumberCell label="Status" value={match.status} />
                <NumberCell
                  label="Mod"
                  value={match.ticketingMode === "paid" ? "Cu plată" : "Gratuit"}
                />
                <NumberCell
                  label="Preț"
                  value={
                    match.ticketingMode === "paid"
                      ? `${(match.ticketPriceCents / 100).toFixed(2)} ${match.currency}`
                      : "0"
                  }
                />
                <NumberCell label="Emise" value={String(match.issuedCount)} />
                <NumberCell label="Scanate" value={String(match.scannedCount)} />
                <div className="lg:justify-self-end">
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
                  >
                    <Link href={`/admin/meciuri/${match.id}` as Route}>Raport meci</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <form action={updateMatchAction} className="grid gap-4 lg:grid-cols-4">
                  <input type="hidden" name="matchId" value={match.id} />
                  <SelectField
                    name="stadiumId"
                    label="Stadion"
                    options={stadiums.map((stadium) => ({
                      value: stadium.id,
                      label: stadium.name,
                    }))}
                    defaultValue={match.stadiumId}
                  />
                  <AdminMatchDerivedFields
                    formId={`match-${match.id}`}
                    defaultHomeTeam={deriveHomeTeam(match.title, match.opponentName)}
                    defaultAwayTeam={match.opponentName}
                    teamSuggestions={teamSuggestions}
                    defaultStartsAt={match.startsAt}
                    defaultReservationOpensAt={match.reservationOpensAt}
                    defaultReservationClosesAt={match.reservationClosesAt}
                  />
                  <Field
                    name={`competition-${match.id}`}
                    htmlName="competitionName"
                    label="Competiție"
                    defaultValue={match.competitionName}
                  />
                  <Field
                    name={`limit-${match.id}`}
                    htmlName="maxTicketsPerUser"
                    label="Limită / user"
                    type="number"
                    defaultValue={String(match.maxTicketsPerUser)}
                  />
                  <SelectField
                    name="status"
                    label="Status"
                    options={matchStatusOptions}
                    defaultValue={match.status}
                  />
                  <SelectField
                    name="ticketingMode"
                    label="Tip ticketing"
                    options={ticketingModeOptions}
                    defaultValue={match.ticketingMode}
                  />
                  <Field
                    name={`price-${match.id}`}
                    htmlName="ticketPriceCents"
                    label="Preț (bani)"
                    type="number"
                    defaultValue={String(match.ticketPriceCents)}
                  />
                  <Field
                    name={`currency-${match.id}`}
                    htmlName="currency"
                    label="Monedă"
                    defaultValue={match.currency}
                  />
                  <label className="flex items-center gap-3 rounded-[22px] border border-black/6 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 lg:col-span-2">
                    <input
                      type="checkbox"
                      name="scannerEnabled"
                      defaultChecked={match.scannerEnabled}
                    />
                    Scanner activ pentru acest meci
                  </label>
                  <div className="flex items-end lg:col-span-2">
                    <Button
                      type="submit"
                      className="w-full rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                    >
                      Salvează modificările
                    </Button>
                  </div>
                </form>

                <form action={deleteMatchAction} className="flex items-end">
                  <input type="hidden" name="matchId" value={match.id} />
                  <ConfirmButton
                    submitForm
                    triggerLabel="Șterge meciul"
                    title="Confirmi ștergerea meciului?"
                    description={`Meciul „${match.title}” va fi șters definitiv împreună cu rezervările, biletele, scanările, plățile și istoricul operațional legat direct de el. Acțiunea nu poate fi anulată.`}
                    confirmLabel="Șterge definitiv"
                    variant="destructive"
                    confirmVariant="destructive"
                    className="rounded-full border border-[#b91c1c] bg-[#fff1f2] px-5 text-[#b91c1c] hover:bg-[#ffe4e6]"
                  />
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function deriveHomeTeam(title: string, opponentName: string) {
  const suffix = ` vs ${opponentName}`;

  if (opponentName && title.endsWith(suffix)) {
    return title.slice(0, -suffix.length);
  }

  return title;
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

function NumberCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-1 text-[#111111]">{value}</p>
    </div>
  );
}
