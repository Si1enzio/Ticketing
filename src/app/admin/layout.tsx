import Link from "next/link";
import { connection } from "next/server";

import { AdminAccessRecovery } from "@/components/admin/admin-access-recovery";
import { hasAnyRole } from "@/lib/auth/roles";
import { getViewerContext } from "@/lib/supabase/queries";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/meciuri", label: "Meciuri" },
  { href: "/admin/organizatori", label: "Organizatori" },
  { href: "/admin/stadion", label: "Locatii" },
  { href: "/admin/tombola", label: "Tombola" },
  { href: "/admin/utilizatori", label: "Utilizatori" },
  { href: "/admin/abuz", label: "Abuz" },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["organizer_admin", "admin", "superadmin"])) {
    return <AdminAccessRecovery />;
  }

  const canSeeGlobalAdminData = hasAnyRole(viewer.roles, ["admin", "superadmin"]);
  const visibleNavItems = navItems.filter((item) => {
    if (canSeeGlobalAdminData) {
      return true;
    }

    return !["/admin/utilizatori", "/admin/abuz"].includes(item.href);
  });

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap gap-3">
        {visibleNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-black/8 bg-white/80 px-4 py-2 text-sm font-medium text-[#111111] shadow-[0_16px_40px_-34px_rgba(23,23,23,0.32)] transition hover:border-[#dc2626]/18 hover:text-[#b91c1c]"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </section>
  );
}
