import { NextResponse } from "next/server";

import { getSafeRedirectPath, withNoStoreHeaders } from "@/lib/security/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appOrigin = requestUrl.origin;
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/autentificare", appOrigin), {
      headers: withNoStoreHeaders(),
    });
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/autentificare", appOrigin), {
      headers: withNoStoreHeaders(),
    });
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/autentificare", appOrigin), {
      headers: withNoStoreHeaders(),
    });
  }

  return NextResponse.redirect(new URL(next, appOrigin), {
    headers: withNoStoreHeaders(),
  });
}
