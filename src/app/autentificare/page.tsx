import { AuthPanel } from "@/components/auth-panel";
import { Card, CardContent } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath =
    resolvedSearchParams.next && resolvedSearchParams.next.startsWith("/")
      ? resolvedSearchParams.next
      : "/cabinet";
  const { messages } = await getServerI18n();

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <Card className="surface-dark overflow-hidden rounded-[32px] border border-black/8 bg-[radial-gradient(circle_at_top_left,rgba(201,162,79,0.26),transparent_28%),linear-gradient(180deg,#0B1A33_0%,#081326_100%)]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#ffffff_0%,#E7D6A5_36%,#C9A24F_100%)]" />
        <CardContent className="space-y-6 p-8">
          <span className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#E7D6A5]">
            {messages.authPage.badge}
          </span>
          <div className="space-y-4">
            <h1 className="font-heading text-5xl uppercase leading-none tracking-[0.12em] text-white">
              {messages.authPage.title}
            </h1>
            <p className="text-base leading-8 text-white/72">
              {messages.authPage.description}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/72">
            {messages.authPage.bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                {bullet}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AuthPanel nextPath={nextPath} />
    </section>
  );
}
