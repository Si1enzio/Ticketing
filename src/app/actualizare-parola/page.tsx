"use client";

import { useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeSupabaseAuthErrorMessage } from "@/lib/security/messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Parola trebuie sa aiba minimum 8 caractere."),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Parolele nu coincid.",
    path: ["confirmPassword"],
  });

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    const parsed = passwordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Date invalide.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      toast.error("Lipseste configuratia Supabase.");
      return;
    }

    setIsPending(true);

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    setIsPending(false);

    if (error) {
      toast.error(
        sanitizeSupabaseAuthErrorMessage(
          error.message,
          "Parola nu a putut fi actualizata acum.",
        ),
      );
      return;
    }

    toast.success("Parola a fost actualizata.");
    router.push("/cabinet");
    router.refresh();
  }

  return (
    <section className="mx-auto flex w-full max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full border-[#d5a021]/15 bg-white/95">
        <CardHeader>
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em]">
            Actualizeaza parola
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Parola noua</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirma parola</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#11552d] hover:bg-[#0e4524]"
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LockKeyhole className="mr-2 h-4 w-4" />
              )}
              Salveaza parola
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
