"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env, getMissingSupabasePublicEnvVars, isSupabaseConfigured } from "@/lib/env";
import { sanitizeSupabaseAuthErrorMessage } from "@/lib/security/messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPanel({ nextPath = "/cabinet" }: { nextPath?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState("signin");
  const { t, locale } = useI18n();
  const signupLabels =
    locale === "ru"
      ? {
          contactEmail: "Контактный email",
          district: "Район / округ",
          birthDate: "Дата рождения",
          gender: "Пол",
          preferredLanguage: "Предпочитаемый язык",
          unspecified: "Не указано",
          male: "Мужской",
          female: "Женский",
          other: "Другой",
        }
      : {
          contactEmail: "Email de contact",
          district: "Raion / judet",
          birthDate: "Data nasterii",
          gender: "Sex",
          preferredLanguage: "Limba preferata",
          unspecified: "Nespecificat",
          male: "Masculin",
          female: "Feminin",
          other: "Altul",
        };

  const signInSchema = z.object({
    email: z.string().email(t("auth.validation.email")),
    password: z.string().min(6, t("auth.validation.password")),
  });

  const signUpSchema = signInSchema.extend({
    fullName: z.string().min(3, t("auth.validation.fullName")),
    phone: z
      .string()
      .trim()
      .min(8, t("auth.validation.phone"))
      .max(32, t("auth.validation.phone"))
      .regex(/^[+0-9()\\s-]+$/, t("auth.validation.phone")),
    contactEmail: z.string().trim().email(t("auth.validation.email")).optional().or(z.literal("")),
    locality: z.string().trim().max(120).optional().or(z.literal("")),
    district: z.string().trim().max(120).optional().or(z.literal("")),
    birthDate: z
      .string()
      .trim()
      .regex(/^$|^\d{4}-\d{2}-\d{2}$/, t("auth.validation.invalidData"))
      .optional()
      .or(z.literal("")),
    gender: z.enum(["unspecified", "male", "female", "other"]).default("unspecified"),
    preferredLanguage: z.enum(["ro", "ru"]).default(locale),
    marketingOptIn: z.boolean().default(false),
    smsOptIn: z.boolean().default(false),
  });

  const resetSchema = z.object({
    email: z.string().email(t("auth.validation.email")),
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const missingSupabaseVars = getMissingSupabasePublicEnvVars();
  const siteOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : env.siteUrl;

  function showMissingSupabaseConfigMessage() {
    toast.error(
      missingSupabaseVars.length
        ? `${t("auth.missingVarsPrefix")} ${missingSupabaseVars.join(", ")}.`
        : t("auth.toasts.missingConfig"),
    );
  }

  async function handleSignIn(formData: FormData) {
    const parsed = signInSchema.safeParse({
      email: formData.get("signin-email"),
      password: formData.get("signin-password"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("auth.validation.invalidData"));
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      showMissingSupabaseConfigMessage();
      return;
    }

    setIsPending(true);

    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    setIsPending(false);

    if (error) {
      toast.error(sanitizeSupabaseAuthErrorMessage(error.message));
      return;
    }

    toast.success(t("auth.toasts.signInSuccess"));
    router.push(nextPath);
    router.refresh();
  }

  async function handleSignUp(formData: FormData) {
    const parsed = signUpSchema.safeParse({
      fullName: formData.get("signup-name"),
      email: formData.get("signup-email"),
      password: formData.get("signup-password"),
      phone: formData.get("signup-phone"),
      contactEmail: formData.get("signup-contact-email") || "",
      locality: formData.get("signup-locality") || "",
      district: formData.get("signup-district") || "",
      birthDate: formData.get("signup-birth-date") || "",
      gender: formData.get("signup-gender") || "unspecified",
      preferredLanguage: formData.get("signup-preferred-language") || locale,
      marketingOptIn: formData.get("signup-marketing-opt-in") === "on",
      smsOptIn: formData.get("signup-sms-opt-in") === "on",
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("auth.validation.invalidData"));
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      showMissingSupabaseConfigMessage();
      return;
    }

    setIsPending(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          contact_email: parsed.data.contactEmail || parsed.data.email,
          locality: parsed.data.locality || null,
          district: parsed.data.district || null,
          birth_date: parsed.data.birthDate || null,
          gender: parsed.data.gender,
          preferred_language: parsed.data.preferredLanguage,
          marketing_opt_in: parsed.data.marketingOptIn,
          sms_opt_in: parsed.data.smsOptIn,
        },
        emailRedirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setIsPending(false);

    if (error) {
      toast.error(sanitizeSupabaseAuthErrorMessage(error.message));
      return;
    }

    if (data.session) {
      toast.success(t("auth.toasts.signUpSession"));
      router.push(nextPath);
      router.refresh();
      return;
    }

    toast.success(t("auth.toasts.signUpSuccess"));
    setMode("signin");
  }

  async function handleReset(formData: FormData) {
    const parsed = resetSchema.safeParse({
      email: formData.get("reset-email"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("auth.validation.invalidData"));
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      showMissingSupabaseConfigMessage();
      return;
    }

    setIsPending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteOrigin}/actualizare-parola`,
    });

    setIsPending(false);

    if (error) {
      toast.error(sanitizeSupabaseAuthErrorMessage(error.message));
      return;
    }

    toast.success(t("auth.toasts.resetSuccess"));
  }

  return (
    <Card className="surface-panel red-ring rounded-[32px] border border-white/60 bg-white/88">
      <CardHeader className="space-y-3">
        <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em] text-[#111111]">
          {t("auth.title")}
        </CardTitle>
        <p className="text-sm leading-6 text-neutral-600">{t("auth.description")}</p>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-3 rounded-full border border-black/6 bg-neutral-100 p-1">
            <TabsTrigger
              value="signin"
              className="rounded-full data-[state=active]:bg-[#dc2626] data-[state=active]:text-white"
            >
              {t("auth.tabs.signin")}
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="rounded-full data-[state=active]:bg-[#dc2626] data-[state=active]:text-white"
            >
              {t("auth.tabs.signup")}
            </TabsTrigger>
            <TabsTrigger
              value="reset"
              className="rounded-full data-[state=active]:bg-[#dc2626] data-[state=active]:text-white"
            >
              {t("auth.tabs.reset")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form
              action={handleSignIn}
              className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
            >
              <Field name="signin-email" label={t("auth.fields.email")} type="email" />
              <Field
                name="signin-password"
                label={t("auth.fields.password")}
                type="password"
              />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <Mail />}
                {t("auth.actions.signin")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form
              action={handleSignUp}
              className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
            >
              <Field name="signup-name" label={t("auth.fields.fullName")} />
              <Field name="signup-email" label={t("auth.fields.email")} type="email" />
              <Field name="signup-phone" label={t("auth.fields.phone")} type="tel" />
              <Field
                name="signup-contact-email"
                label={signupLabels.contactEmail}
                type="email"
                required={false}
              />
              <Field
                name="signup-locality"
                label={t("auth.fields.locality")}
                required={false}
              />
              <Field
                name="signup-district"
                label={signupLabels.district}
                required={false}
              />
              <Field
                name="signup-birth-date"
                label={signupLabels.birthDate}
                type="date"
                required={false}
              />
              <SelectField
                name="signup-gender"
                label={signupLabels.gender}
                defaultValue="unspecified"
                options={[
                  { value: "unspecified", label: signupLabels.unspecified },
                  { value: "male", label: signupLabels.male },
                  { value: "female", label: signupLabels.female },
                  { value: "other", label: signupLabels.other },
                ]}
              />
              <SelectField
                name="signup-preferred-language"
                label={signupLabels.preferredLanguage}
                defaultValue={locale}
                options={[
                  { value: "ro", label: t("common.romanian") },
                  { value: "ru", label: t("common.russian") },
                ]}
              />
              <Field
                name="signup-password"
                label={t("auth.fields.password")}
                type="password"
              />
              <div className="grid gap-3 rounded-[24px] border border-black/6 bg-neutral-50 p-4 text-sm text-neutral-700">
                <p className="text-xs leading-5 text-neutral-500">{t("auth.signupHelp")}</p>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="signup-marketing-opt-in"
                    className="mt-0.5 h-4 w-4 rounded border-black/20 accent-[#dc2626]"
                  />
                  <span>{t("auth.fields.marketingConsent")}</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="signup-sms-opt-in"
                    className="mt-0.5 h-4 w-4 rounded border-black/20 accent-[#dc2626]"
                  />
                  <span>{t("auth.fields.smsConsent")}</span>
                </label>
              </div>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                {t("auth.actions.signup")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="reset" className="mt-6">
            <form
              action={handleReset}
              className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
            >
              <Field name="reset-email" label={t("auth.fields.email")} type="email" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-[#111111] bg-[#111111] text-white hover:bg-black"
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}
                {t("auth.actions.reset")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-[#111111]">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        className="rounded-2xl border-black/8 bg-neutral-50 focus-visible:border-[#dc2626] focus-visible:ring-[#dc2626]/20"
      />
    </div>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
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
