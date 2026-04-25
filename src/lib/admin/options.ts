import { roleLabels, type AppRole } from "@/lib/auth/roles";

export const assignableRoles: AppRole[] = [
  "user",
  "steward",
  "organizer_admin",
  "admin",
  "superadmin",
];

export const restrictionTypeOptions = [
  { value: "warning", label: "Avertisment" },
  { value: "block", label: "Blocare" },
  { value: "temp_ban", label: "Ban temporar" },
] as const;

export const restrictionReasonOptions = [
  { value: "No-show repetat", label: "No-show repetat" },
  { value: "Rezervari suspecte", label: "Rezervari suspecte" },
  { value: "Tentative repetate de abuz", label: "Tentative repetate de abuz" },
  { value: "Solicitare suport", label: "Solicitare suport" },
  { value: "Verificare manuala", label: "Verificare manuala" },
] as const;

export const roleOptions = assignableRoles.map((role) => ({
  value: role,
  label: roleLabels[role],
}));
