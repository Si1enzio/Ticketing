"use client";

import { useFormStatus } from "react-dom";

import type { ProfileDetails } from "@/lib/domain/types";
import { updateViewerProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileDetailsForm({
  profile,
  locale,
}: {
  profile: ProfileDetails;
  locale: string;
}) {
  return (
    <form action={updateViewerProfileAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nume si prenume" name="fullName" defaultValue={profile.fullName ?? ""} required />
        <Field
          label="Email de contact"
          name="contactEmail"
          type="email"
          defaultValue={profile.contactEmail ?? profile.email ?? ""}
        />
        <Field label="Telefon" name="phone" defaultValue={profile.phone ?? ""} />
        <Field label="Localitate" name="locality" defaultValue={profile.locality ?? ""} />
        <Field label="Raion / judet" name="district" defaultValue={profile.district ?? ""} />
        <Field
          label="Data nasterii"
          name="birthDate"
          type="date"
          defaultValue={profile.birthDate ?? ""}
        />
        <div className="grid gap-2">
          <Label htmlFor="gender">Sex</Label>
          <select
            id="gender"
            name="gender"
            defaultValue={profile.gender}
            className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
          >
            <option value="unspecified">Nedeclarat</option>
            <option value="male">Masculin</option>
            <option value="female">Feminin</option>
            <option value="other">Altul</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="preferredLanguage">Limba preferata</Label>
          <select
            id="preferredLanguage"
            name="preferredLanguage"
            defaultValue={profile.preferredLanguage || locale || "ro"}
            className="h-11 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
          >
            <option value="ro">Romana</option>
            <option value="ru">Rusa</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 rounded-[24px] border border-black/6 bg-neutral-50 p-4 text-sm text-neutral-700">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="marketingOptIn"
            defaultChecked={profile.marketingOptIn}
            className="h-4 w-4 rounded border-black/20 accent-[#dc2626]"
          />
          Sunt de acord sa primesc informari si oferte de marketing.
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="smsOptIn"
            defaultChecked={profile.smsOptIn}
            className="h-4 w-4 rounded border-black/20 accent-[#dc2626]"
          />
          Sunt de acord sa primesc SMS-uri legate de meciuri si acces.
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="rounded-full border border-[#dc2626] bg-[#dc2626] px-6 text-white hover:bg-[#b91c1c]"
    >
      {pending ? "Se salveaza..." : "Salveaza profilul"}
    </Button>
  );
}
