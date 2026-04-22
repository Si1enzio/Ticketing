"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { hasMinimumRole, normalizeRoles, roleLabels } from "@/lib/auth/roles";
import { mockViewer } from "@/lib/domain/mock";
import type { ViewerContext } from "@/lib/domain/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const navigation = [
    { href: "/", label: t("common.matches") },
    { href: "/cabinet", label: t("common.cabinet") },
    { href: "/scanner", label: t("common.scanner") },
    { href: "/admin", label: t("common.admin") },
  ] as const;
  const visibleNavigation = navigation.filter((item) => !shouldHideNavItem(item.href, viewer));

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
  const stewardOnly = isStewardOnly(viewer);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setViewer(mockViewer);
    router.push("/");
    router.refresh();
  }

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
              <p className="text-xs text-neutral-500">{t("header.venue")}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {visibleNavigation.map((item) => {
              const disabled = isNavItemDisabled(item.href, viewer);

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
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full border-[#111111]/10 bg-white text-[#111111] hover:bg-neutral-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("common.openMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[86vw] max-w-sm border-l border-black/8 bg-white px-0"
            >
              <SheetHeader className="border-b border-black/6 px-5 pb-5">
                <SheetTitle className="text-xl uppercase tracking-[0.18em] text-[#111111]">
                  {t("common.menu")}
                </SheetTitle>
                <SheetDescription className="text-sm leading-6 text-neutral-500">
                  {t("header.menuDescription")}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 px-5 py-5">
                <div className="rounded-[22px] border border-black/8 bg-neutral-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {t("common.language")}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={locale === "ro" ? "default" : "outline"}
                      onClick={() => setLocale("ro")}
                      className="rounded-full"
                    >
                      {t("common.romanian")}
                    </Button>
                    <Button
                      type="button"
                      variant={locale === "ru" ? "default" : "outline"}
                      onClick={() => setLocale("ru")}
                      className="rounded-full"
                    >
                      {t("common.russian")}
                    </Button>
                  </div>
                </div>
                {visibleNavigation.map((item) => {
                  const disabled = isNavItemDisabled(item.href, viewer);
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={disabled ? "/" : item.href}
                        className={cn(
                          "rounded-[22px] border px-4 py-4 text-base font-medium transition",
                          disabled
                            ? "pointer-events-none border-black/6 bg-neutral-100 text-neutral-400"
                            : "border-black/8 bg-white text-[#111111] hover:border-[#dc2626]/18 hover:bg-[#fff1f2] hover:text-[#b91c1c]",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              {viewer.isAuthenticated ? (
                <div className="mt-auto border-t border-black/6 px-5 py-5">
                  <Badge className="rounded-full border border-[#dc2626]/12 bg-[#dc2626]/8 px-3 py-1 text-[#b91c1c] hover:bg-[#dc2626]/8">
                    {roleLabels[highestRole]}
                  </Badge>
                  <p className="mt-3 text-sm font-semibold text-[#111111]">
                    {viewer.fullName ?? viewer.email ?? t("header.activeAccount")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    {viewer.isPrivileged
                      ? t("common.roleAdminAccess")
                      : stewardOnly
                        ? t("header.stewardOnly")
                        : t("header.cabinetActive")}
                  </p>
                  {!stewardOnly ? (
                    <div className="mt-4">
                      <SheetClose asChild>
                        <Button
                          asChild
                        className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                      >
                          <Link href="/cabinet">{t("common.tickets")}</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSignOut()}
                        className="w-full rounded-full border-black/10 bg-white text-[#111111] hover:bg-neutral-100"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("common.logout")}
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              ) : (
                <div className="mt-auto border-t border-black/6 px-5 py-5">
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
                    >
                      <Link href="/autentificare">{t("common.login")}</Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <div className="hidden items-center gap-2 lg:flex">
            <Button
              type="button"
              variant={locale === "ro" ? "default" : "outline"}
              onClick={() => setLocale("ro")}
              className="rounded-full"
            >
              RO
            </Button>
            <Button
              type="button"
              variant={locale === "ru" ? "default" : "outline"}
              onClick={() => setLocale("ru")}
              className="rounded-full"
            >
              RU
            </Button>
          </div>

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
                  {viewer.fullName ?? viewer.email ?? t("header.activeAccount")}
                </p>
                <p className="text-xs text-neutral-500">
                  {viewer.isPrivileged
                    ? t("common.roleAdminAccess")
                    : stewardOnly
                      ? t("common.roleSteward")
                      : t("common.roleCabinet")}
                </p>
              </div>
              {!stewardOnly ? (
                <Button
                  asChild
                  className="hidden rounded-full border border-[#dc2626] bg-[#dc2626] px-5 text-white hover:bg-[#b91c1c] sm:inline-flex"
                >
                  <Link href="/cabinet">{t("common.tickets")}</Link>
                </Button>
              ) : null}
            </>
          ) : (
            <Button
              asChild
              className="hidden rounded-full border border-[#dc2626] bg-[#dc2626] px-5 text-white hover:bg-[#b91c1c] sm:inline-flex"
            >
              <Link href="/autentificare">{t("common.login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function isNavItemDisabled(href: string, viewer: ViewerContext) {
  return (
    (href === "/scanner" &&
      !viewer.roles.includes("steward") &&
      !viewer.roles.includes("admin") &&
      !viewer.roles.includes("superadmin")) ||
    (href === "/admin" && !viewer.isAdmin) ||
    (href === "/cabinet" && (!viewer.isAuthenticated || isStewardOnly(viewer)))
  );
}

function shouldHideNavItem(href: string, viewer: ViewerContext) {
  if (href === "/admin" && !viewer.isAdmin) {
    return true;
  }

  if (
    href === "/scanner" &&
    !viewer.roles.includes("steward") &&
    !viewer.roles.includes("admin") &&
    !viewer.roles.includes("superadmin")
  ) {
    return true;
  }

  if (href === "/cabinet" && (!viewer.isAuthenticated || isStewardOnly(viewer))) {
    return true;
  }

  if (href === "/" && isStewardOnly(viewer)) {
    return true;
  }

  return false;
}

function isStewardOnly(viewer: ViewerContext) {
  return viewer.roles.includes("steward") && !viewer.isAdmin;
}
