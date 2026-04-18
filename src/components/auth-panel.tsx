"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { LoaderCircle, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { env, isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const signInSchema = z.object({
  email: z.string().email("Introdu o adresă de email validă."),
  password: z.string().min(6, "Parola trebuie să aibă minimum 6 caractere."),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(3, "Introdu numele complet."),
});

const resetSchema = z.object({
  email: z.string().email("Introdu o adresă de email validă."),
});

export function AuthPanel() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [mode, setMode] = useState("signin");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
      toast.error("Configurează variabilele Supabase pentru autentificare.");
      return;
    }

    setIsPending(true);

    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    setIsPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Autentificare reușită.");
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
      toast.error("Configurează variabilele Supabase pentru autentificare.");
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
      toast.success("Cont creat și autentificat.");
      router.push("/cabinet");
      router.refresh();
      return;
    }

    toast.success("Cont creat. Verifică emailul pentru confirmare.");
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
      toast.error("Configurează variabilele Supabase pentru autentificare.");
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
    <Card className="border-[#d5a021]/15 bg-white/95 shadow-[0_20px_80px_-42px_rgba(8,20,15,0.45)]">
      <CardHeader className="space-y-3">
        <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em] text-[#08140f]">
          Intră în platformă
        </CardTitle>
        <p className="text-sm leading-6 text-slate-600">
          Creează cont, rezervă până la 4 bilete per meci și accesează QR-urile din
          cabinetul personal.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-3 rounded-full bg-[#f2efe3]">
            <TabsTrigger value="signin" className="rounded-full">
              Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">
              Cont nou
            </TabsTrigger>
            <TabsTrigger value="reset" className="rounded-full">
              Resetare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form
              action={handleSignIn}
              className="grid gap-4 rounded-3xl border border-[#e7dfbf] bg-[#fbf9f1] p-5"
            >
              <Field name="signin-email" label="Email" type="email" />
              <Field name="signin-password" label="Parolă" type="password" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[#11552d] hover:bg-[#0e4524]"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <Mail />}
                Autentificare
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form
              action={handleSignUp}
              className="grid gap-4 rounded-3xl border border-[#e7dfbf] bg-[#fbf9f1] p-5"
            >
              <Field name="signup-name" label="Nume complet" />
              <Field name="signup-email" label="Email" type="email" />
              <Field name="signup-password" label="Parolă" type="password" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[#11552d] hover:bg-[#0e4524]"
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
                Creează cont
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="reset" className="mt-6">
            <form
              action={handleReset}
              className="grid gap-4 rounded-3xl border border-[#e7dfbf] bg-[#fbf9f1] p-5"
            >
              <Field name="reset-email" label="Email" type="email" />
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[#11552d] hover:bg-[#0e4524]"
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
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required className="rounded-2xl bg-white" />
    </div>
  );
}

