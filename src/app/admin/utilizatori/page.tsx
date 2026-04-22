import { connection } from "next/server";

import { AdminUserCard } from "@/components/admin/admin-user-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { restrictionReasonOptions, restrictionTypeOptions, roleOptions } from "@/lib/admin/options";
import type { AdminUserOverview } from "@/lib/domain/types";
import { getAdminUsersOverview } from "@/lib/supabase/queries";

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
  searchParams?: Promise<{ sort?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const sort = isUserSort(resolvedSearchParams.sort) ? resolvedSearchParams.sort : defaultSort;
  const users = sortUsers(await getAdminUsersOverview(), sort);

  return (
    <div className="grid gap-8">
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
