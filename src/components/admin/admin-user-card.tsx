import type { Route } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";

import {
  assignRoleAction,
  createUserBlockAction,
  removeUserAccessScopeAction,
  saveUserAccessScopeAction,
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
  scopeOptions: {
    organizers: Array<{ id: string; name: string }>;
    locations: Array<{ id: string; name: string; organizerId: string | null }>;
  };
  accessScopes: Array<{
    id: string;
    role: string;
    organizerId: string | null;
    organizerName: string | null;
    locationId: string | null;
    locationName: string | null;
  }>;
  canManageScopes: boolean;
};

export function AdminUserCard({
  user,
  roleOptions,
  restrictionTypeOptions,
  restrictionReasonOptions,
  scopeOptions,
  accessScopes,
  canManageScopes,
}: AdminUserCardProps) {
  const displayName = user.fullName ?? "Utilizator fara nume";
  const email = user.email ?? "Fara email";
  const registeredLabel = formatDateTime(user.registeredAt);
  const lastTicketLabel = formatDateTime(user.lastTicketIssuedAt);
  const lastScanLabel = formatDateTime(user.lastValidScanAt);

  return (
    <details className="surface-panel group overflow-hidden rounded-[28px] border border-white/70 bg-white/92">
      <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#dc2626_45%,#fda4af_100%)]" />
      <summary className="list-none cursor-pointer p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="min-w-0 text-lg font-semibold leading-tight text-[#111111]">
                {displayName}
              </p>
              <StatusBadge
                tone={user.activeBlockType ? "danger" : user.canReserve ? "success" : "neutral"}
                text={user.activeBlockType ? "Restrictionat" : user.canReserve ? "Acces activ" : "Acces oprit"}
              />
            </div>
            <p className="mt-1 truncate text-sm text-neutral-500">{email}</p>

            <div className="mt-3 grid max-w-md grid-cols-3 gap-2 md:hidden">
              <MobileMetric label="Bilete" value={user.totalReserved} />
              <MobileMetric label="Intrari" value={user.totalScanned} />
              <MobileMetric label="Abuz" value={formatMetric(user.abuseScore)} />
            </div>

            <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-neutral-500 md:flex">
              <span>Roluri: {user.roles.join(", ")}</span>
              <span>Inregistrat: {registeredLabel}</span>
              <span>Bilete: {user.totalReserved}</span>
              <span>Intrari: {user.totalScanned}</span>
              <span>Abuz: {formatMetric(user.abuseScore)}</span>
              <span>No-show: {Math.round(user.noShowRatio * 100)}%</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-row items-center justify-end gap-3 md:min-w-[220px] md:flex-col md:items-end md:text-right">
            <div className="hidden space-y-1 text-xs uppercase tracking-[0.18em] text-neutral-500 md:block">
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
            <InfoCell label="Roluri" value={user.roles.join(", ") || "Fara rol"} />
            <InfoCell label="Cont creat" value={registeredLabel} />
            <InfoCell label="Bilete total" value={String(user.totalReserved)} />
            <InfoCell label="Intrari validate" value={String(user.totalScanned)} />
            <InfoCell label="Abuse score" value={formatMetric(user.abuseScore)} />
            <InfoCell label="No-show" value={`${Math.round(user.noShowRatio * 100)}%`} />
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

          {canManageScopes ? (
            <div className="grid gap-3 rounded-[26px] border border-black/6 bg-neutral-50 p-4">
              <div>
                <Label>Scope operational</Label>
                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  Leaga stewardii si adminii de organizator doar de organizatorul sau locatia pe care o gestioneaza.
                </p>
              </div>

              {accessScopes.length ? (
                <div className="grid gap-2">
                  {accessScopes.map((scope) => (
                    <form
                      key={scope.id}
                      action={removeUserAccessScopeAction}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-black/6 bg-white px-4 py-3"
                    >
                      <input type="hidden" name="scopeId" value={scope.id} />
                      <input type="hidden" name="userId" value={user.userId} />
                      <div className="text-sm text-[#111111]">
                        <p className="font-semibold">
                          {scope.role === "organizer_admin" ? "Admin organizator" : "Steward"}
                        </p>
                        <p className="text-neutral-500">
                          {scope.organizerName ? `Organizator: ${scope.organizerName}` : "Fara organizator"}{" "}
                          · {scope.locationName ? `Locatie: ${scope.locationName}` : "Toate locatiile din scope"}
                        </p>
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        className="rounded-full border-[#dc2626]/18 bg-white text-[#b91c1c] hover:bg-[#fef2f2]"
                      >
                        Sterge
                      </Button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Nu exista inca scope-uri operationale atribuite.</p>
              )}

              <form action={saveUserAccessScopeAction} className="grid gap-3 rounded-[20px] border border-dashed border-black/10 bg-white p-4">
                <input type="hidden" name="userId" value={user.userId} />
                <SelectField
                  name={`scope-role-${user.userId}`}
                  htmlName="role"
                  label="Rol operational"
                  defaultValue={user.roles.includes("organizer_admin") ? "organizer_admin" : "steward"}
                  options={[
                    { value: "steward", label: "Steward" },
                    { value: "organizer_admin", label: "Admin organizator" },
                  ]}
                />
                <SelectField
                  name={`scope-organizer-${user.userId}`}
                  htmlName="organizerId"
                  label="Organizator"
                  defaultValue=""
                  options={scopeOptions.organizers.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  allowEmpty
                  emptyLabel="Orice organizator / nespecificat"
                />
                <SelectField
                  name={`scope-location-${user.userId}`}
                  htmlName="locationId"
                  label="Locatie"
                  defaultValue=""
                  options={scopeOptions.locations.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  allowEmpty
                  emptyLabel="Toate locatiile din scope"
                />
                <Button
                  type="submit"
                  className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
                >
                  Adauga scope
                </Button>
              </form>
            </div>
          ) : null}
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

function MobileMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-black/6 bg-neutral-50 px-2.5 py-2">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#111111]">{value}</p>
    </div>
  );
}

function SelectField({
  name,
  htmlName,
  label,
  defaultValue,
  options,
  allowEmpty = false,
  emptyLabel = "Selecteaza",
}: {
  name: string;
  htmlName?: string;
  label: string;
  defaultValue?: string;
  options: Option[];
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
