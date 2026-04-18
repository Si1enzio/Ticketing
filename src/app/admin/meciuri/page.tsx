import type { Route } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { createMatchAction, updateMatchAction } from "@/lib/actions/admin";
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
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
          Management meciuri
        </p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
          Creeaza, editeaza si publica meciuri
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
            <Field name="title" label="Titlu meci" />
            <Field name="slug" label="Slug" />
            <Field name="competitionName" label="Competitie" />
            <Field name="opponentName" label="Adversar" />
            <Field name="startsAt" label="Start" type="datetime-local" />
            <Field name="maxTicketsPerUser" label="Limita / user" type="number" defaultValue="4" />
            <Field name="status" label="Status" defaultValue="published" />
            <Field name="reservationOpensAt" label="Deschidere ticketing" type="datetime-local" />
            <Field name="reservationClosesAt" label="Inchidere ticketing" type="datetime-local" />
            <SelectField
              name="ticketingMode"
              label="Tip ticketing"
              options={[
                { value: "free", label: "Gratuit" },
                { value: "paid", label: "Platit" },
              ]}
              defaultValue="free"
            />
            <Field name="ticketPriceCents" label="Pret (bani)" type="number" defaultValue="0" />
            <Field name="currency" label="Moneda" defaultValue="MDL" />
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
                <NumberCell label="Mod" value={match.ticketingMode === "paid" ? "Platit" : "Gratuit"} />
                <NumberCell
                  label="Pret"
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
                <Field
                  name={`title-${match.id}`}
                  htmlName="title"
                  label="Titlu meci"
                  defaultValue={match.title}
                />
                <Field
                  name={`slug-${match.id}`}
                  htmlName="slug"
                  label="Slug"
                  defaultValue={match.slug}
                />
                <Field
                  name={`competition-${match.id}`}
                  htmlName="competitionName"
                  label="Competitie"
                  defaultValue={match.competitionName}
                />
                <Field
                  name={`opponent-${match.id}`}
                  htmlName="opponentName"
                  label="Adversar"
                  defaultValue={match.opponentName}
                />
                <Field
                  name={`starts-${match.id}`}
                  htmlName="startsAt"
                  label="Start"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(match.startsAt)}
                />
                <Field
                  name={`limit-${match.id}`}
                  htmlName="maxTicketsPerUser"
                  label="Limita / user"
                  type="number"
                  defaultValue={String(match.maxTicketsPerUser)}
                />
                <Field
                  name={`status-${match.id}`}
                  htmlName="status"
                  label="Status"
                  defaultValue={match.status}
                />
                <Field
                  name={`open-${match.id}`}
                  htmlName="reservationOpensAt"
                  label="Deschidere ticketing"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(match.reservationOpensAt ?? "")}
                />
                <Field
                  name={`close-${match.id}`}
                  htmlName="reservationClosesAt"
                  label="Inchidere ticketing"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(match.reservationClosesAt ?? "")}
                />
                <SelectField
                  name="ticketingMode"
                  label="Tip ticketing"
                  options={[
                    { value: "free", label: "Gratuit" },
                    { value: "paid", label: "Platit" },
                  ]}
                  defaultValue={match.ticketingMode}
                />
                <Field
                  name={`price-${match.id}`}
                  htmlName="ticketPriceCents"
                  label="Pret (bani)"
                  type="number"
                  defaultValue={String(match.ticketPriceCents)}
                />
                <Field
                  name={`currency-${match.id}`}
                  htmlName="currency"
                  label="Moneda"
                  defaultValue={match.currency}
                />
                <label className="flex items-center gap-3 rounded-[22px] border border-black/6 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 lg:col-span-2">
                  <input type="checkbox" name="scannerEnabled" defaultChecked={match.scannerEnabled} />
                  Scanner activ pentru acest meci
                </label>
                <div className="flex items-end lg:col-span-2">
                  <Button
                    type="submit"
                    className="w-full rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                  >
                    Salveaza modificarile
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
        required={type !== "datetime-local" || Boolean(defaultValue)}
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

function toDateTimeLocalValue(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}
