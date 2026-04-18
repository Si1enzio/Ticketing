"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasMinimumRole, normalizeRoles, roleLabels } from "@/lib/auth/roles";
import { mockViewer } from "@/lib/domain/mock";
import type { ViewerContext } from "@/lib/domain/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Meciuri" },
  { href: "/cabinet", label: "Cabinet" },
  { href: "/scanner", label: "Scanner" },
  { href: "/admin", label: "Admin" },
] as const;

function toViewerContext(
  base: Omit<ViewerContext, "isAdmin" | "isAuthenticated" | "isPrivileged">,
) {
  const roles = normalizeRoles(base.roles);

  return {
    ...base,
    roles,
    isAuthenticated: Boolean(base.userId),
    isPrivileged: hasMinimumRole(roles, "admin"),
    isAdmin: hasMinimumRole(roles, "admin"),
  } satisfies ViewerContext;
}

function getHighestRole(viewer: ViewerContext) {
  if (viewer.roles.includes("superadmin")) {
    return "superadmin";
  }

  if (viewer.roles.includes("admin")) {
    return "admin";
  }

  if (viewer.roles.includes("steward")) {
    return "steward";
  }

  if (viewer.roles.includes("user")) {
    return "user";
  }

  return "guest";
}

export function SiteHeader() {
  const [viewer, setViewer] = useState<ViewerContext>(mockViewer);

  const syncViewer = useEffectEvent(async () => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setViewer(mockViewer);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setViewer(mockViewer);
      return;
    }

    const [{ data: profile }, { data: roles }, { data: block }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, can_reserve")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("user_blocks")
        .select("type, ends_at, reason")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profileRecord = profile as {
      full_name?: string | null;
      can_reserve?: boolean | null;
    } | null;
    const roleRows = (roles ?? []) as Array<{ role: string }>;
    const activeBlock = block as { ends_at?: string | null; reason?: string | null } | null;

    setViewer(
      toViewerContext({
        userId: user.id,
        email: user.email ?? null,
        fullName: profileRecord?.full_name ?? null,
        canReserve: Boolean(profileRecord?.can_reserve),
        roles: normalizeRoles(roleRows.map((item) => item.role)),
        reservationBlockedUntil: activeBlock?.ends_at ?? null,
        reservationBlockReason: activeBlock?.reason ?? null,
      }),
    );
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    queueMicrotask(() => {
      void syncViewer();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncViewer();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const highestRole = getHighestRole(viewer);

  return (
    <header className="sticky top-0 z-40 border-b border-black/8 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[linear-gradient(135deg,#ef4444,#991b1b)] text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_12px_30px_-18px_rgba(220,38,38,0.8)]">
              MO
            </div>
            <div>
              <p className="font-heading text-lg uppercase tracking-[0.26em] text-[#111111]">
                Milsami Ticketing
              </p>
              <p className="text-xs text-neutral-500">Stadionul Municipal Orhei</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navigation.map((item) => {
              const disabled =
                (item.href === "/scanner" &&
                  !viewer.roles.includes("steward") &&
                  !viewer.roles.includes("admin") &&
                  !viewer.roles.includes("superadmin")) ||
                (item.href === "/admin" && !viewer.isAdmin) ||
                (item.href === "/cabinet" && !viewer.isAuthenticated);

              return (
                <Link
                  key={item.href}
                  href={disabled ? "/" : item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    disabled
                      ? "pointer-events-none bg-neutral-100 text-neutral-400"
                      : "text-neutral-600 hover:bg-[#dc2626]/8 hover:text-[#b91c1c]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {viewer.isAuthenticated ? (
            <>
              <Badge
                variant="secondary"
                className="hidden rounded-full border border-[#dc2626]/12 bg-[#dc2626]/8 px-3 py-1 text-[#b91c1c] sm:inline-flex"
              >
                {roleLabels[highestRole]}
              </Badge>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[#111111]">
                  {viewer.fullName ?? viewer.email ?? "Cont activ"}
                </p>
                <p className="text-xs text-neutral-500">
                  {viewer.isPrivileged
                    ? "Acces administrativ activ"
                    : viewer.canReserve
                      ? "Poate solicita bilete gratuite"
                      : "Cabinet personal"}
                </p>
              </div>
              <Button
                asChild
                className="rounded-full border border-[#dc2626] bg-[#dc2626] px-5 text-white hover:bg-[#b91c1c]"
              >
                <Link href="/cabinet">Biletele mele</Link>
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="rounded-full border border-[#dc2626] bg-[#dc2626] px-5 text-white hover:bg-[#b91c1c]"
            >
              <Link href="/autentificare">Autentificare</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
