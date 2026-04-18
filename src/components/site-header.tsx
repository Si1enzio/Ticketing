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
  { href: "/scanner", label: "Scanner" },
  { href: "/admin", label: "Admin" },
] as const;

function toViewerContext(base: Omit<ViewerContext, "isAdmin" | "isAuthenticated" | "isPrivileged">) {
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
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
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

    const profileRecord = profile as { full_name?: string | null } | null;
    const roleRows = (roles ?? []) as Array<{ role: string }>;
    const activeBlock = block as { ends_at?: string | null; reason?: string | null } | null;

    setViewer(
      toViewerContext({
        userId: user.id,
        email: user.email ?? null,
        fullName: profileRecord?.full_name ?? null,
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08140f]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d5a021]/30 bg-gradient-to-br from-[#125c30] to-[#0b2b19] text-sm font-black uppercase tracking-[0.2em] text-[#f6c453]">
              MO
            </div>
            <div>
              <p className="font-heading text-lg uppercase tracking-[0.26em] text-white">
                Milsami Ticketing
              </p>
              <p className="text-xs text-white/60">
                Stadionul Municipal &quot;Orhei&quot;
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navigation.map((item) => {
              const disabled =
                (item.href === "/scanner" &&
                  !viewer.roles.includes("steward") &&
                  !viewer.roles.includes("admin") &&
                  !viewer.roles.includes("superadmin")) ||
                (item.href === "/admin" && !viewer.isAdmin);

              return (
                <Link
                  key={item.href}
                  href={disabled ? "/" : item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    disabled
                      ? "pointer-events-none opacity-40"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
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
                className="hidden rounded-full border border-[#d5a021]/20 bg-[#143b27] px-3 py-1 text-[#f8d376] sm:inline-flex"
              >
                {roleLabels[highestRole]}
              </Badge>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">
                  {viewer.fullName ?? viewer.email ?? "Cont activ"}
                </p>
                <p className="text-xs text-white/55">Cabinet personal</p>
              </div>
              <Button
                asChild
                className="rounded-full bg-[#d5a021] text-[#08140f] hover:bg-[#f0bd44]"
              >
                <Link href="/cabinet">Biletele mele</Link>
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="rounded-full bg-[#d5a021] text-[#08140f] hover:bg-[#f0bd44]"
            >
              <Link href="/autentificare">Autentificare</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
