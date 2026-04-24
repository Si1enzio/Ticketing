import { NextResponse } from "next/server";
import { z } from "zod";

import { hasAnyRole } from "@/lib/auth/roles";
import { withNoStoreHeaders } from "@/lib/security/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const syncSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = syncSessionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Date invalide pentru resincronizarea sesiunii.",
      },
      {
        status: 400,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message: "Clientul server pentru autentificare nu este disponibil.",
      },
      {
        status: 503,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: parsed.data.accessToken,
    refresh_token: parsed.data.refreshToken,
  });

  if (sessionError || !sessionData.session?.user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nu am putut resincroniza sesiunea pe server.",
      },
      {
        status: 401,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", sessionData.session.user.id);

  if (rolesError) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nu am putut valida rolurile administrative.",
      },
      {
        status: 500,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const roleList = (roles ?? []).map((item) => item.role);

  if (!hasAnyRole(roleList, ["admin", "superadmin"])) {
    return NextResponse.json(
      {
        ok: false,
        message: "Contul autentificat nu are acces administrativ.",
      },
      {
        status: 403,
        headers: withNoStoreHeaders(),
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
    },
    {
      headers: withNoStoreHeaders(),
    },
  );
}
