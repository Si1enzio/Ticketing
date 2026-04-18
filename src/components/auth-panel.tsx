"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  env,
  getMissingSupabasePublicEnvVars,
  isSupabaseConfigured,
} from "@/lib/env";

const signInSchema = z.object({
  email: z.string().email("Introdu o adresa de email valida."),
  password: z.string().min(6, "Parola trebuie sa aiba minimum 6 caractere."),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(3, "Introdu numele complet."),
});

const resetSchema = z.object({
  email: z.string().email("Introdu o adresa de email valida."),
});

export function AuthPanel() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState("signin");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const missingSupabaseVars = getMissingSupabasePublicEnvVars();

  function showMissingSupabaseConfigMessage() {
    toast.error(
      missingSupabaseVars.length
        ? `Lipsesc variabilele publice Supabase: ${missingSupabaseVars.join(", ")}. Daca rulezi local, actualizeaza .env.local si reporneste serverul Next.`
        : "Configuratia publica Supabase nu este disponibila in acest build. Daca rulezi local, reporneste serverul Next dupa ce actualizezi .env.local.",
    );
  }

  async function handleSignIn(formData: FormData) {
    const parsed = signInSchema.safeParse({
      email: formData.get("signin-email"),
      password: formData.get("signin-password"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Date invalide.");
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

    toast.success("Autentificare reusita.");
    router.push("/cabinet");
    router.refresh();
  }

  async function handleSignUp(formData: FormData) {
    const parsed = signUpSchema.safeParse({
      fullName: formData.get("signup-name"),
      email: formData.get("signup-email"),
      password: formData.get("signup-password"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Date invalide.");
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
        emailRedirectTo: `${env.siteUrl}/auth/callback?next=/cabinet`,
      },
    });

    setIsPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success("Cont creat si autentificat.");
      router.push("/cabinet");
      router.refresh();
      return;
    }

    toast.success("Cont creat. Verifica emailul pentru confirmare.");
    setMode("signin");
  }

  async function handleReset(formData: FormData) {
    const parsed = resetSchema.safeParse({
      email: formData.get("reset-email"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Date invalide.");
      return;
    }

    if (!supabase || !isSupabaseConfigured()) {
      showMissingSupabaseConfigMessage();
      return;
    }

    setIsPending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.siteUrl}/actualizare-parola`,
    });

    setIsPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Link-ul pentru resetare a fost trimis pe email.");
  }

  return (
    <Card className="surface-panel red-ring rounded-[32px] border border-white/60 bg-white/88">
      <CardHeader className="space-y-3">
        <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em] text-[#111111]">
          Intra in platforma
        </CardTitle>
        <p className="text-sm leading-6 text-neutral-600">
          Creeaza cont, rezerva pana la 4 bilete per meci si acceseaza QR-urile din
          cabinetul personal.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-3 rounded-full border border-black/6 bg-neutral-100 p-1">
            <TabsTrigger
              value="signin"
              className="rounded-full data-[state=active]:bg-[#dc2626] data-[state=active]:text-white"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="rounded-full data-[state=active]:bg-[#dc2626] data-[state=active]:text-white"
            >
              Cont nou
            </TabsTrigger>
            <TabsTrigger
              value="reset"
              className="rounded-full data-[state=active]:bg-[#dc2626] data-[state=active]:text-white"
            >
              Resetare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form
              action={handleSignIn}
              className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
            >
              <Field name="signin-email" label="Email" type="email" />
              <Field name="signin-password" label="Parola" type="password" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <Mail />}
                Autentificare
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form
              action={handleSignUp}
              className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
            >
              <Field name="signup-name" label="Nume complet" />
              <Field name="signup-email" label="Email" type="email" />
              <Field name="signup-password" label="Parola" type="password" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                Creeaza cont
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="reset" className="mt-6">
            <form
              action={handleReset}
              className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
            >
              <Field name="reset-email" label="Email" type="email" />
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
                Trimite link de resetare
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
