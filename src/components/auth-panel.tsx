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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPanel({ nextPath = "/cabinet" }: { nextPath?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState("signin");
  const { t } = useI18n();

  const signInSchema = z.object({
    email: z.string().email(t("auth.validation.email")),
    password: z.string().min(6, t("auth.validation.password")),
  });

  const signUpSchema = signInSchema.extend({
    fullName: z.string().min(3, t("auth.validation.fullName")),
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
      toast.error(error.message);
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
        },
        emailRedirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setIsPending(false);

    if (error) {
      toast.error(error.message);
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
      toast.error(error.message);
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
              <Field
                name="signup-password"
                label={t("auth.fields.password")}
                type="password"
              />
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
}: {
  name: string;
  label: string;
  type?: string;
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
        required
        className="rounded-2xl border-black/8 bg-neutral-50 focus-visible:border-[#dc2626] focus-visible:ring-[#dc2626]/20"
      />
    </div>
  );
}
