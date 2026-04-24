"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { AdminMatchDerivedFields } from "@/components/admin/admin-match-derived-fields";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMatchAction, updateMatchAction } from "@/lib/actions/admin";
import type { AdminMatchOverview } from "@/lib/domain/types";

type Option = {
  value: string;
  label: string;
};

type AdminMatchCardProps = {
  match: AdminMatchOverview;
  stadiumOptions: Option[];
  teamSuggestions: string[];
  matchStatusOptions: Option[];
  ticketingModeOptions: Option[];
};

export function AdminMatchCard({
  match,
  stadiumOptions,
  teamSuggestions,
  matchStatusOptions,
  ticketingModeOptions,
}: AdminMatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="surface-panel overflow-hidden rounded-[30px] border border-white/70 bg-white/94">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fca5a5_100%)]" />
      <div className="grid gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
              {formatMatchStatus(match.status)} -{" "}
              {match.ticketingMode === "paid" ? "Cu plata" : "Gratuit"} -{" "}
              {formatMatchDate(match.startsAt)}
            </p>
            <p className="mt-1 text-xl font-semibold text-[#111111]">{match.title}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {match.competitionName} · {match.stadiumName}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
            >
              <Link href={`/admin/meciuri/${match.id}` as Route}>Raport meci</Link>
            </Button>
            <form action={deleteMatchAction}>
              <input type="hidden" name="matchId" value={match.id} />
              <ConfirmButton
                submitForm
                triggerLabel="Sterge meciul"
                title="Confirmi stergerea meciului?"
                description={`Meciul „${match.title}” va fi sters definitiv impreuna cu rezervarile, biletele, scanarile, platile si istoricul operational legat direct de el. Actiunea nu poate fi anulata.`}
                confirmLabel="Sterge definitiv"
                variant="destructive"
                confirmVariant="destructive"
                className="rounded-full border border-[#b91c1c] bg-[#fff1f2] px-5 text-[#b91c1c] hover:bg-[#ffe4e6]"
              />
            </form>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-black/10 bg-white text-[#111111]"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? "Detalii ^" : "Detalii v"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-6">
          <NumberCell label="Status" value={formatMatchStatus(match.status)} />
          <NumberCell
            label="Mod"
            value={match.ticketingMode === "paid" ? "Cu plata" : "Gratuit"}
          />
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
          <NumberCell label="Limita" value={`${match.maxTicketsPerUser} / cont`} />
        </div>

        {isExpanded ? (
          <div className="grid gap-4 border-t border-black/6 pt-4 lg:grid-cols-[1fr]">
            <form
              action={updateMatchAction}
              encType="multipart/form-data"
              className="grid gap-4 lg:grid-cols-4"
            >
              <input type="hidden" name="matchId" value={match.id} />
              <input type="hidden" name="posterUrl" value={match.posterUrl ?? ""} />
              <input type="hidden" name="bannerUrl" value={match.bannerUrl ?? ""} />
              <SelectField
                name={`stadium-${match.id}`}
                htmlName="stadiumId"
                label="Stadion"
                options={stadiumOptions}
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
              <MediaUploadField
                id={`posterFile-${match.id}`}
                name="posterFile"
                label="Poster / afis"
                defaultPreviewUrl={match.posterUrl ?? undefined}
                helpText="Incarca o imagine noua doar daca vrei sa inlocuiesti posterul curent. Recomandat: 1080x1350 px, raport 4:5."
                previewClassName="aspect-[4/5]"
                className="lg:col-span-2"
              />
              <MediaUploadField
                id={`bannerFile-${match.id}`}
                name="bannerFile"
                label="Banner"
                defaultPreviewUrl={match.bannerUrl ?? undefined}
                helpText="Incarca o imagine noua doar daca vrei sa inlocuiesti bannerul curent. Recomandat: 1600x900 px, raport 16:9."
                previewClassName="aspect-[16/9]"
                className="lg:col-span-2"
              />
              <Field
                name={`competition-${match.id}`}
                htmlName="competitionName"
                label="Competitie"
                defaultValue={match.competitionName}
              />
              <Field
                name={`limit-${match.id}`}
                htmlName="maxTicketsPerUser"
                label="Limita / user"
                type="number"
                defaultValue={String(match.maxTicketsPerUser)}
              />
              <SelectField
                name={`status-${match.id}`}
                htmlName="status"
                label="Status"
                options={matchStatusOptions}
                defaultValue={match.status}
              />
              <SelectField
                name={`ticketing-mode-${match.id}`}
                htmlName="ticketingMode"
                label="Tip ticketing"
                options={ticketingModeOptions}
                defaultValue={match.ticketingMode}
              />
              <Field
                name={`price-${match.id}`}
                htmlName="ticketPriceLei"
                label="Pret (lei)"
                type="number"
                step="0.01"
                min="0"
                defaultValue={formatLeiInputValue(match.ticketPriceCents)}
              />
              <Field
                name={`currency-${match.id}`}
                htmlName="currency"
                label="Moneda"
                defaultValue={match.currency}
                readOnly
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
                  Salveaza modificarile
                </Button>
              </div>
            </form>
          </div>
        ) : null}
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

function formatMatchStatus(status: string) {
  switch (status) {
    case "draft":
      return "Ciorna";
    case "published":
      return "Publicat";
    case "closed":
      return "Inchis";
    case "completed":
      return "Finalizat";
    case "canceled":
      return "Anulat";
    default:
      return status;
  }
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({
  name,
  htmlName,
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
  htmlName?: string;
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
        name={htmlName ?? name}
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
  htmlName,
  label,
  options,
  defaultValue,
}: {
  name: string;
  htmlName?: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
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
    <div className="rounded-[22px] border border-black/6 bg-neutral-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#111111]">{value}</p>
    </div>
  );
}

function formatLeiInputValue(amountCents: number) {
  const valueInLei = amountCents / 100;

  return Number.isInteger(valueInLei) ? String(valueInLei) : valueInLei.toFixed(2);
}
