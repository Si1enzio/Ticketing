export const roleValues = [
  "guest",
  "user",
  "steward",
  "admin",
  "superadmin",
] as const;

export type AppRole = (typeof roleValues)[number];

export const roleLabels: Record<AppRole, string> = {
  guest: "Vizitator",
  user: "Suporter",
  steward: "Steward",
  admin: "Administrator",
  superadmin: "Superadministrator",
};

const rolePriority: Record<AppRole, number> = {
  guest: 0,
  user: 1,
  steward: 2,
  admin: 3,
  superadmin: 4,
};

export function normalizeRoles(roles: string[] | null | undefined): AppRole[] {
  if (!roles?.length) {
    return ["guest"];
  }

  const normalized = roles.filter((role): role is AppRole =>
    roleValues.includes(role as AppRole),
  );

  return normalized.length ? normalized : ["guest"];
}

export function hasAnyRole(
  roles: readonly AppRole[],
  allowed: readonly AppRole[],
) {
  const normalized = normalizeRoles([...roles]);

  return allowed.some((role) => normalized.includes(role));
}

export function hasMinimumRole(
  roles: readonly AppRole[],
  minimumRole: AppRole,
) {
  const normalized = normalizeRoles([...roles]);

  return normalized.some((role) => rolePriority[role] >= rolePriority[minimumRole]);
}
