"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { profileGenderSchema } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewerContext } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(32).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  locality: z.string().max(120).optional().or(z.literal("")),
  district: z.string().max(120).optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  gender: profileGenderSchema.default("unspecified"),
  preferredLanguage: z.string().min(2).max(12).default("ro"),
  marketingOptIn: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  smsOptIn: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export async function updateViewerProfileAction(formData: FormData) {
  const viewer = await getViewerContext();

  if (!viewer.userId || !isSupabaseConfigured()) {
    return;
  }

  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || "",
    contactEmail: formData.get("contactEmail") || "",
    locality: formData.get("locality") || "",
    district: formData.get("district") || "",
    birthDate: formData.get("birthDate") || "",
    gender: formData.get("gender") || "unspecified",
    preferredLanguage: formData.get("preferredLanguage") || "ro",
    marketingOptIn: formData.get("marketingOptIn") ? "true" : "false",
    smsOptIn: formData.get("smsOptIn") ? "true" : "false",
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  await supabase.rpc("update_profile_self", {
    p_full_name: parsed.data.fullName,
    p_phone: parsed.data.phone || null,
    p_contact_email: parsed.data.contactEmail || null,
    p_locality: parsed.data.locality || null,
    p_district: parsed.data.district || null,
    p_birth_date: parsed.data.birthDate || null,
    p_gender: parsed.data.gender,
    p_preferred_language: parsed.data.preferredLanguage,
    p_marketing_opt_in: parsed.data.marketingOptIn ?? false,
    p_sms_opt_in: parsed.data.smsOptIn ?? false,
  });

  revalidatePath("/cabinet");
}
