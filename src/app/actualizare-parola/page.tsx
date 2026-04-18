"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Parola trebuie să aibă minimum 8 caractere."),
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
      toast.error("Lipsește configurația Supabase.");
      return;
    }

    setIsPending(true);

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    setIsPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Parola a fost actualizată.");
    router.push("/cabinet");
    router.refresh();
  }

  return (
    <section className="mx-auto flex w-full max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="w-full border-[#d5a021]/15 bg-white/95">
        <CardHeader>
          <CardTitle className="font-heading text-4xl uppercase tracking-[0.12em]">
            Actualizează parola
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Parolă nouă</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmă parola</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button type="submit" disabled={isPending} className="rounded-full bg-[#11552d] hover:bg-[#0e4524]">
              {isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LockKeyhole className="mr-2 h-4 w-4" />
              )}
              Salvează parola
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

