import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { hasAnyRole } from "@/lib/auth/roles";
import { getViewerContext } from "@/lib/supabase/queries";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/meciuri", label: "Meciuri" },
  { href: "/admin/stadion", label: "Stadion" },
  { href: "/admin/utilizatori", label: "Utilizatori" },
  { href: "/admin/abuz", label: "Abuz" },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["admin", "superadmin"])) {
    return (
      <section className="mx-auto flex w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="w-full border-[#d5a021]/15 bg-white/95">
          <CardContent className="space-y-4 p-8">
            <h1 className="font-heading text-5xl uppercase tracking-[0.12em] text-[#08140f]">
              Acces limitat
            </h1>
            <p className="text-sm leading-7 text-slate-600">
              Zona admin este disponibilă doar pentru rolurile `admin` și
              `superadmin`.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap gap-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-[#d5a021]/20 bg-white/80 px-4 py-2 text-sm font-medium text-[#08140f]"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </section>
  );
}

