import Link from "next/link";
import { connection } from "next/server";

import { StadiumMapAdminEditor } from "@/components/stadium/stadium-map-admin-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAdminStadiumMapConfigs, getStadiumBuilderData } from "@/lib/supabase/queries";

export default async function AdminStadiumMapPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const resolvedSearchParams = (await searchParams) ?? {};
  const [stadiums, configs] = await Promise.all([
    getStadiumBuilderData(),
    getAdminStadiumMapConfigs(),
  ]);

  return (
    <div className="grid gap-8">
      {resolvedSearchParams.error ? (
        <Alert
          variant="destructive"
          className="rounded-[24px] border border-[#fecaca] bg-[#fff1f2] px-5 py-4 text-[#b91c1c]"
        >
          <AlertTitle className="text-base font-semibold">Salvarea a fost blocata</AlertTitle>
          <AlertDescription className="text-sm text-[#b91c1c]">
            {resolvedSearchParams.error}
          </AlertDescription>
        </Alert>
      ) : null}

      {resolvedSearchParams.notice ? (
        <Alert className="rounded-[24px] border border-[#d1fae5] bg-[#ecfdf5] px-5 py-4 text-[#166534]">
          <AlertTitle className="text-base font-semibold">Configuratie salvata</AlertTitle>
          <AlertDescription className="text-sm text-[#166534]">
            {resolvedSearchParams.notice}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b91c1c]">
            Harta locatiei
          </p>
          <h1 className="mt-2 font-heading text-5xl uppercase tracking-[0.08em] text-[#111111]">
            Builder overview SVG
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
            Aici configurezi geometria overview map-ului reutilizabil pentru fiecare locatie.
            Structura de locuri ramane in continuare administrata din zona Locatii.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
        >
          <Link href="/admin/stadion">Inapoi la Locatii</Link>
        </Button>
      </div>

      <StadiumMapAdminEditor stadiums={stadiums} configs={configs} />
    </div>
  );
}
