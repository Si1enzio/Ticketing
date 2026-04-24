"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasAnyRole, normalizeRoles } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RecoveryState = "syncing" | "failed" | "denied";

export function AdminAccessRecovery() {
  const router = useRouter();
  const [state, setState] = useState<RecoveryState>("syncing");
  const [message, setMessage] = useState(
    "Verificam sesiunea administrativa si resincronizam accesul pe server.",
  );

  useEffect(() => {
    let cancelled = false;

    async function syncAdminSession() {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        if (!cancelled) {
          setState("failed");
          setMessage("Clientul de autentificare nu este disponibil in browser.");
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token || !session.refresh_token || !session.user) {
        if (!cancelled) {
          setState("denied");
          setMessage("Nu exista o sesiune autentificata valida pentru acest browser.");
        }
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const roleRows = (roles ?? []) as Array<{ role: string }>;

      if (
        rolesError ||
        !hasAnyRole(normalizeRoles(roleRows.map((item) => item.role)), ["admin", "superadmin"])
      ) {
        if (!cancelled) {
          setState("denied");
          setMessage("Contul autentificat nu are rol admin sau superadmin.");
        }
        return;
      }

      const response = await fetch("/api/auth/sync-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;

        if (!cancelled) {
          setState("failed");
          setMessage(
            payload?.message ??
              "Resincronizarea sesiunii administrative a esuat. Incearca un refresh.",
          );
        }
        return;
      }

      router.refresh();
    }

    void syncAdminSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="mx-auto flex w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Card className="surface-panel w-full rounded-[30px] border border-white/70 bg-white/94">
        <CardContent className="space-y-5 p-8">
          <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
            {state === "syncing" ? "Verificare acces" : "Acces limitat"}
          </h1>
          <p className="text-sm leading-7 text-neutral-600">{message}</p>

          {state === "syncing" ? (
            <div className="inline-flex items-center gap-3 rounded-full border border-[#0B1A33]/10 bg-[#0B1A33]/4 px-4 py-2 text-sm font-medium text-[#0B1A33]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Se incearca recuperarea sesiunii admin.
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-full border border-[#0B1A33] bg-[#0B1A33] text-white hover:bg-[#132641]"
            >
              Reincearca
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
