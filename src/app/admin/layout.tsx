import Link from "next/link";
import { connection } from "next/server";

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
  await connection();
  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["admin", "superadmin"])) {
    return (
      <section className="mx-auto flex w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="surface-panel w-full rounded-[30px] border border-white/70 bg-white/94">
          <CardContent className="space-y-4 p-8">
            <h1 className="font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
              Acces limitat
            </h1>
            <p className="text-sm leading-7 text-neutral-600">
              Zona admin este disponibila doar pentru rolurile admin si superadmin.
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
