import { connection } from "next/server";

import { AdminUserCard } from "@/components/admin/admin-user-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManagedUserAction } from "@/lib/actions/admin";
import { restrictionReasonOptions, restrictionTypeOptions, roleOptions } from "@/lib/admin/options";
import type { AdminUserOverview } from "@/lib/domain/types";
import { getAdminUsersOverview, getViewerContext } from "@/lib/supabase/queries";

const userSortOptions = [
  { value: "recent-registration", label: "Conturi noi" },
  { value: "oldest-registration", label: "Conturi vechi" },
  { value: "alphabetical-asc", label: "Alfabetic A-Z" },
  { value: "alphabetical-desc", label: "Alfabetic Z-A" },
  { value: "recent-ticket", label: "Achizitii / emitere recenta" },
  { value: "recent-entry", label: "Ultima intrare scanata" },
  { value: "most-tickets", label: "Cele mai multe bilete" },
  { value: "highest-abuse", label: "Abuse score mare" },
] as const;

type UserSort = (typeof userSortOptions)[number]["value"];

const defaultSort: UserSort = "recent-registration";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string; error?: string; notice?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const sort = isUserSort(resolvedSearchParams.sort) ? resolvedSearchParams.sort : defaultSort;
  const [viewer, usersOverview] = await Promise.all([
    getViewerContext(),
    getAdminUsersOverview(),
  ]);
  const users = sortUsers(usersOverview, sort);
  const canCreateUsers = viewer.roles.includes("superadmin");

  return (
    <div className="grid gap-8">
      {resolvedSearchParams.notice ? (
        <Alert className="rounded-[22px] border-[#16a34a]/20 bg-[#f0fdf4] text-[#166534]">
          <AlertTitle>Operatiune reusita</AlertTitle>
          <AlertDescription>{resolvedSearchParams.notice}</AlertDescription>
        </Alert>
      ) : null}

      {resolvedSearchParams.error ? (
        <Alert
          variant="destructive"
          className="rounded-[22px] border-[#dc2626]/20 bg-[#fff1f2] text-[#991b1b]"
        >
          <AlertTitle>Operatiunea a fost blocata</AlertTitle>
          <AlertDescription>{resolvedSearchParams.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Moderare conturi
          </p>
          <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
            Utilizatori, roluri si restrictii
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
            Lista este compactata la un singur rand per utilizator. Deschizi doar contul de care ai nevoie, iar restul raman stranse pentru navigare mai rapida.
          </p>
        </div>

        <Card className="surface-panel rounded-[28px] border border-white/70 bg-white/92">
          <CardContent className="p-5">
            <form className="grid gap-2">
              <Label htmlFor="user-sort">Sorteaza utilizatorii</Label>
              <select
                id="user-sort"
                name="sort"
                defaultValue={sort}
                className="h-10 min-w-[260px] rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
              >
                {userSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                variant="outline"
                className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
              >
                Aplica sortarea
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {canCreateUsers ? <CreateManagedUserPanel /> : null}

      <div className="grid gap-4">
        {users.map((user) => (
          <AdminUserCard
            key={user.userId}
            user={user}
            roleOptions={roleOptions}
            restrictionTypeOptions={restrictionTypeOptions.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            restrictionReasonOptions={restrictionReasonOptions.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          />
        ))}
      </div>
    </div>
  );
}

function CreateManagedUserPanel() {
  return (
    <details className="surface-panel group overflow-hidden rounded-[30px] border border-white/70 bg-white/92">
      <summary className="list-none cursor-pointer p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
              Cont nou
            </p>
            <h2 className="mt-2 font-heading text-3xl uppercase tracking-[0.08em] text-[#111111]">
              Creeaza utilizator cu parola, rol si profil
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Contul este creat direct in Supabase Auth, emailul este confirmat automat, iar profilul CRM si rolul sunt salvate imediat.
            </p>
          </div>
          <span className="rounded-full border border-[#111111] bg-white px-5 py-2 text-sm font-semibold text-[#111111] transition group-open:bg-[#111111] group-open:text-white">
            Deschide formularul
          </span>
        </div>
      </summary>

      <form
        action={createManagedUserAction}
        className="grid gap-5 border-t border-black/6 p-5"
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <TextField label="Nume si prenume" name="fullName" placeholder="Ex: Ion Popescu" required />
          <TextField label="Email login" name="email" type="email" placeholder="ion@example.com" required />
          <TextField label="Parola initiala" name="password" type="password" minLength={8} required />
          <SelectField label="Rol" name="role" defaultValue="user" options={roleOptions} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <TextField label="Telefon" name="phone" placeholder="+373..." />
          <TextField label="Email contact" name="contactEmail" type="email" placeholder="optional" />
          <TextField label="Localitate" name="locality" placeholder="Orhei" />
          <TextField label="Raion / district" name="district" placeholder="Orhei" />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <TextField label="Data nasterii" name="birthDate" type="date" />
          <SelectField
            label="Sex"
            name="gender"
            defaultValue="unspecified"
            options={[
              { value: "unspecified", label: "Nespecificat" },
              { value: "male", label: "Masculin" },
              { value: "female", label: "Feminin" },
              { value: "other", label: "Altul" },
            ]}
          />
          <SelectField
            label="Limba preferata"
            name="preferredLanguage"
            defaultValue="ro"
            options={[
              { value: "ro", label: "Romana" },
              { value: "ru", label: "Rusa" },
            ]}
          />
          <div className="grid gap-2 rounded-[22px] border border-black/6 bg-neutral-50 p-4">
            <label className="flex items-start gap-3 text-sm font-medium text-[#111111]">
              <input
                type="checkbox"
                name="canReserve"
                value="true"
                defaultChecked
                className="mt-1 size-4 accent-[#dc2626]"
              />
              Poate obtine bilete imediat
            </label>
            <label className="flex items-start gap-3 text-sm font-medium text-[#111111]">
              <input
                type="checkbox"
                name="marketingOptIn"
                value="true"
                className="mt-1 size-4 accent-[#dc2626]"
              />
              Accept marketing / CRM
            </label>
            <label className="flex items-start gap-3 text-sm font-medium text-[#111111]">
              <input
                type="checkbox"
                name="smsOptIn"
                value="true"
                className="mt-1 size-4 accent-[#dc2626]"
              />
              Accept SMS
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#dc2626]/12 bg-[#fff1f2] p-4 text-sm leading-6 text-[#7f1d1d]">
          <p>
            Recomandare: seteaza parole temporare si cere utilizatorului sa o schimbe dupa prima autentificare.
          </p>
          <Button
            type="submit"
            className="rounded-full bg-[#dc2626] px-8 text-white hover:bg-[#b91c1c]"
          >
            Creeaza utilizator
          </Button>
        </div>
      </form>
    </details>
  );
}

function TextField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="h-11 rounded-2xl border-black/8 bg-white"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
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

function isUserSort(value: string | undefined): value is UserSort {
  return userSortOptions.some((option) => option.value === value);
}

function sortUsers(users: AdminUserOverview[], sort: UserSort) {
  const copy = [...users];

  copy.sort((left, right) => {
    switch (sort) {
      case "alphabetical-asc":
        return getUserDisplayName(left).localeCompare(getUserDisplayName(right), "ro");
      case "alphabetical-desc":
        return getUserDisplayName(right).localeCompare(getUserDisplayName(left), "ro");
      case "oldest-registration":
        return compareDates(left.registeredAt, right.registeredAt, "asc");
      case "recent-ticket":
        return compareDates(left.lastTicketIssuedAt, right.lastTicketIssuedAt, "desc");
      case "recent-entry":
        return compareDates(left.lastValidScanAt, right.lastValidScanAt, "desc");
      case "most-tickets":
        return (right.totalReserved - left.totalReserved) || getUserDisplayName(left).localeCompare(getUserDisplayName(right), "ro");
      case "highest-abuse":
        return (right.abuseScore - left.abuseScore) || getUserDisplayName(left).localeCompare(getUserDisplayName(right), "ro");
      case "recent-registration":
      default:
        return compareDates(left.registeredAt, right.registeredAt, "desc");
    }
  });

  return copy;
}

function getUserDisplayName(user: AdminUserOverview) {
  return (user.fullName ?? user.email ?? "utilizator").trim().toLowerCase();
}

function compareDates(
  left: string | null,
  right: string | null,
  direction: "asc" | "desc",
) {
  const leftValue = left ? new Date(left).getTime() : Number.NaN;
  const rightValue = right ? new Date(right).getTime() : Number.NaN;

  const leftSafe = Number.isNaN(leftValue)
    ? direction === "desc"
      ? Number.NEGATIVE_INFINITY
      : Number.POSITIVE_INFINITY
    : leftValue;
  const rightSafe = Number.isNaN(rightValue)
    ? direction === "desc"
      ? Number.NEGATIVE_INFINITY
      : Number.POSITIVE_INFINITY
    : rightValue;

  return direction === "desc" ? rightSafe - leftSafe : leftSafe - rightSafe;
}
