import type { Route } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";

import {
  assignRoleAction,
  createUserBlockAction,
  setReservationAccessAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUserOverview } from "@/lib/domain/types";

type Option = {
  value: string;
  label: string;
};

type AdminUserCardProps = {
  user: AdminUserOverview;
  roleOptions: Option[];
  restrictionTypeOptions: Option[];
  restrictionReasonOptions: Option[];
};

export function AdminUserCard({
  user,
  roleOptions,
  restrictionTypeOptions,
  restrictionReasonOptions,
}: AdminUserCardProps) {
  const displayName = user.fullName ?? "Utilizator fara nume";
  const email = user.email ?? "Fara email";
  const registeredLabel = formatDateTime(user.registeredAt);
  const lastTicketLabel = formatDateTime(user.lastTicketIssuedAt);
  const lastScanLabel = formatDateTime(user.lastValidScanAt);

  return (
    <details className="surface-panel group overflow-hidden rounded-[28px] border border-white/70 bg-white/92">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fda4af_100%)]" />
      <summary className="list-none cursor-pointer p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold text-[#111111]">{displayName}</p>
              <StatusBadge
                tone={user.activeBlockType ? "danger" : user.canReserve ? "success" : "neutral"}
                text={user.activeBlockType ? "Restrictionat" : user.canReserve ? "Acces activ" : "Acces oprit"}
              />
            </div>
            <p className="mt-1 text-sm text-neutral-500">{email}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
              <span>Roluri: {user.roles.join(", ")}</span>
              <span>Inregistrat: {registeredLabel}</span>
              <span>Bilete: {user.totalReserved}</span>
              <span>Intrari: {user.totalScanned}</span>
              <span>Abuz: {formatMetric(user.abuseScore)}</span>
              <span>No-show: {Math.round(user.noShowRatio * 100)}%</span>
            </div>
          </div>

          <div className="flex min-w-[220px] flex-col items-end gap-3 text-right">
            <div className="space-y-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
              <p>Ultimul bilet: {lastTicketLabel}</p>
              <p>Ultima intrare: {lastScanLabel}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-neutral-50 px-4 py-2 text-sm font-medium text-[#111111]">
              Detalii
              <ChevronDownIcon className="size-4 transition group-open:rotate-180" />
            </span>
          </div>
        </div>
      </summary>

      <div className="grid gap-4 border-t border-black/6 p-5 xl:grid-cols-[1fr_0.95fr_1fr]">
        <div className="space-y-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#111111]">Rezumat operational</p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                Date rapide pentru suport, moderare si verificare activitate.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
            >
              <Link href={`/admin/utilizatori/${user.userId}` as Route}>Pagina utilizator</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCell label="Cont creat" value={registeredLabel} />
            <InfoCell label="Ultimul bilet" value={lastTicketLabel} />
            <InfoCell label="Ultima intrare" value={lastScanLabel} />
            <InfoCell
              label="Blocare activa"
              value={
                user.activeBlockType
                  ? `${user.activeBlockType}${user.activeBlockUntil ? ` pana la ${formatDateTime(user.activeBlockUntil)}` : ""}`
                  : "Nu"
              }
            />
          </div>
        </div>

        <div className="grid gap-4">
          <form
            action={setReservationAccessAction}
            className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4"
          >
            <input type="hidden" name="userId" value={user.userId} />
            <input type="hidden" name="canReserve" value={user.canReserve ? "false" : "true"} />
            <Label>Solicitare bilete gratuite</Label>
            <p className="text-sm leading-6 text-neutral-600">
              Drept explicit pentru utilizatorii obisnuiti. Rolurile administrative pot emite prin privilegii, fara aceasta bifare.
            </p>
            <Button
              type="submit"
              className={
                user.canReserve
                  ? "rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                  : "rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              }
            >
              {user.canReserve ? "Revoca accesul la bilete" : "Acorda acces la bilete"}
            </Button>
          </form>

          <form
            action={assignRoleAction}
            className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4"
          >
            <input type="hidden" name="userId" value={user.userId} />
            <SelectField
              name={`role-${user.userId}`}
              htmlName="role"
              label="Atribuie rol"
              defaultValue={user.roles[0] ?? "user"}
              options={roleOptions}
            />
            <Button
              type="submit"
              className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
            >
              Salveaza rolul
            </Button>
          </form>
        </div>

        <form
          action={createUserBlockAction}
          className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4"
        >
          <input type="hidden" name="userId" value={user.userId} />
          <SelectField
            name={`type-${user.userId}`}
            htmlName="type"
            label="Tip restrictie"
            defaultValue="warning"
            options={restrictionTypeOptions}
          />
          <SelectField
            name={`reason-${user.userId}`}
            htmlName="reason"
            label="Motiv"
            defaultValue={restrictionReasonOptions[0]?.value}
            options={restrictionReasonOptions}
          />
          <div className="grid gap-2">
            <Label htmlFor={`note-${user.userId}`}>Nota interna</Label>
            <Input
              id={`note-${user.userId}`}
              name="note"
              placeholder="Detalii suplimentare pentru echipa"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`ends-${user.userId}`}>Valabil pana la</Label>
            <Input id={`ends-${user.userId}`} name="endsAt" type="datetime-local" />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="rounded-full border-[#dc2626]/18 bg-white text-[#b91c1c] hover:bg-[#fef2f2]"
          >
            Aplica restrictia
          </Button>
        </form>
      </div>
    </details>
  );
}

function SelectField({
  name,
  htmlName,
  label,
  defaultValue,
  options,
}: {
  name: string;
  htmlName?: string;
  label: string;
  defaultValue?: string;
  options: Option[];
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-black/6 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#111111]">{value}</p>
    </div>
  );
}

function StatusBadge({
  text,
  tone,
}: {
  text: string;
  tone: "success" | "danger" | "neutral";
}) {
  const className =
    tone === "success"
      ? "border-[#16a34a]/15 bg-[#f0fdf4] text-[#166534]"
      : tone === "danger"
        ? "border-[#dc2626]/15 bg-[#fff1f2] text-[#b91c1c]"
        : "border-black/8 bg-neutral-100 text-neutral-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}`}>
      {text}
    </span>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Fara activitate";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "d MMM yyyy, HH:mm", { locale: ro });
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
