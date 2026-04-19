import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appOrigin = requestUrl.origin;
  const next = requestUrl.searchParams.get("next") ?? "/cabinet";
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/autentificare", appOrigin));
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/autentificare", appOrigin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/autentificare?eroare=${encodeURIComponent(error.message)}`, appOrigin),
    );
  }

  return NextResponse.redirect(new URL(next, appOrigin));
}
