import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { hasAnyRole } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/env";
import { isSupabaseAdminConfigured } from "@/lib/env.server";
import {
  sanitizeUserFacingErrorMessage,
  withNoStoreHeaders,
} from "@/lib/security/http";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const matchMediaBucket = "event-media";
const maxMatchMediaFileSizeBytes = 12 * 1024 * 1024;
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: "Upload-ul imaginilor nu este configurat complet.",
      },
      {
        status: 503,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message: "Sesiunea server nu este disponibila pentru upload.",
      },
      {
        status: 503,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Trebuie sa fii autentificat pentru a incarca imagini.",
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
    .eq("user_id", user.id);

  if (rolesError || !hasAnyRole((roles ?? []).map((item) => item.role), ["admin", "superadmin"])) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nu ai permisiunea de a incarca imagini pentru evenimente.",
      },
      {
        status: 403,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      {
        ok: false,
        message: "Cererea de upload nu este valida.",
      },
      {
        status: 400,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const fileValue = formData.get("file");
  const mediaKind = String(formData.get("mediaKind") ?? "").trim();
  const uploadFolder = String(formData.get("uploadFolder") ?? "").trim();

  if (!(fileValue instanceof File) || fileValue.size <= 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nu a fost selectat niciun fisier pentru upload.",
      },
      {
        status: 400,
        headers: withNoStoreHeaders(),
      },
    );
  }

  if (mediaKind !== "poster" && mediaKind !== "banner") {
    return NextResponse.json(
      {
        ok: false,
        message: "Tipul imaginii nu este recunoscut.",
      },
      {
        status: 400,
        headers: withNoStoreHeaders(),
      },
    );
  }

  if (fileValue.size > maxMatchMediaFileSizeBytes) {
    return NextResponse.json(
      {
        ok: false,
        message: "Imaginea este prea mare. Limita maxima este 12 MB pentru fiecare fisier.",
      },
      {
        status: 413,
        headers: withNoStoreHeaders(),
      },
    );
  }

  if (!allowedImageMimeTypes.has(fileValue.type)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Poti incarca doar imagini PNG, JPG, WEBP, GIF sau AVIF.",
      },
      {
        status: 415,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      {
        ok: false,
        message: "Clientul administrativ pentru upload nu este disponibil.",
      },
      {
        status: 503,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const extension = getFileExtension(fileValue);
  const safeFolder = sanitizePathSegment(uploadFolder || "matches/drafts");
  const path = `${safeFolder}/${mediaKind}-${Date.now()}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await adminClient.storage
    .from(matchMediaBucket)
    .upload(path, await fileValue.arrayBuffer(), {
      contentType: fileValue.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        ok: false,
        message:
          sanitizeUserFacingErrorMessage(
            uploadError.message,
            "Imaginea nu a putut fi incarcata. Incearca din nou.",
          ) ?? "Imaginea nu a putut fi incarcata. Incearca din nou.",
      },
      {
        status: 500,
        headers: withNoStoreHeaders(),
      },
    );
  }

  const { data } = adminClient.storage.from(matchMediaBucket).getPublicUrl(path);

  return NextResponse.json(
    {
      ok: true,
      url: data.publicUrl,
      path,
    },
    {
      headers: withNoStoreHeaders(),
    },
  );
}

function getFileExtension(file: File) {
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  return mimeToExtension[file.type] ?? file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "");
}
