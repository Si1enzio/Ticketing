import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/cabinet";
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/autentificare", env.siteUrl));
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/autentificare", env.siteUrl));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/autentificare?eroare=${encodeURIComponent(error.message)}`, env.siteUrl),
    );
  }

  return NextResponse.redirect(new URL(next, env.siteUrl));
}
