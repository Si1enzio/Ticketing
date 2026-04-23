import { NextResponse } from "next/server";
import { z } from "zod";

import { hasAnyRole } from "@/lib/auth/roles";
import { scanResponseSchema } from "@/lib/domain/types";
import { withNoStoreHeaders, isTrustedOriginValue } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  formatTicketFingerprint,
  verifyAccessToken,
} from "@/lib/security/tickets";
import { getViewerContext } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  token: z.string().min(8),
  matchId: z.string().uuid(),
  deviceLabel: z.string().max(120).optional(),
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: withNoStoreHeaders(),
  });
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const contentType = request.headers.get("content-type") ?? "";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipRateLimit = checkRateLimit({
    key: `scanner:ip:${clientIp}`,
    limit: 180,
    windowMs: 60_000,
  });

  if (!ipRateLimit.ok) {
    return jsonResponse(
      {
        result: "blocked",
        message: "Prea multe incercari de scanare intr-un interval scurt.",
      },
      429,
    );
  }

  if (requestOrigin && !isTrustedOriginValue(requestOrigin, request.url)) {
    return jsonResponse(
      {
        result: "blocked",
        message: "Originea cererii nu este permisa pentru scanner.",
      },
      403,
    );
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(
      {
        result: "invalid_token",
        message: "Cererea pentru scanner trebuie trimisa in format JSON.",
      },
      415,
    );
  }

  const viewer = await getViewerContext();

  if (!hasAnyRole(viewer.roles, ["steward", "admin", "superadmin"])) {
    return jsonResponse(
      {
        result: "blocked",
        message: "Nu ai permisiunea de a folosi scannerul.",
      },
      403,
    );
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(
      {
        result: "invalid_token",
        message: "Payload invalid pentru validare.",
      },
      400,
    );
  }

  if (!viewer.userId) {
    return jsonResponse(
      {
        result: "blocked",
        message: "Sesiunea stewardului nu este valida.",
      },
      403,
    );
  }

  const stewardRateLimit = checkRateLimit({
    key: `scanner:steward:${viewer.userId}`,
    limit: 90,
    windowMs: 15_000,
  });

  if (!stewardRateLimit.ok) {
    return jsonResponse(
      {
        result: "blocked",
        message: "Scannerul primeste prea multe cereri simultan. Reincearca imediat.",
      },
      429,
    );
  }

  let payload: Awaited<ReturnType<typeof verifyAccessToken>>;

  try {
    payload = await verifyAccessToken(parsed.data.token);
  } catch {
    return jsonResponse(
      {
        result: "invalid_token",
        message: "Semnatura QR nu este valida.",
      },
      400,
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return jsonResponse(
      {
        result: "invalid_token",
        message: "Conexiunea Supabase nu este disponibila.",
      },
      500,
    );
  }

  const tokenFingerprint = formatTicketFingerprint(parsed.data.token);
  const rpcName =
    payload.kind === "subscription" ? "scan_subscription_token" : "scan_ticket_token";
  const rpcPayload =
    payload.kind === "subscription"
      ? {
          p_match_id: parsed.data.matchId,
          p_subscription_code: payload.code,
          p_token_version: payload.version,
          p_steward_id: viewer.userId,
          p_gate_id: null,
          p_device_label: parsed.data.deviceLabel ?? null,
          p_token_fingerprint: tokenFingerprint,
        }
      : {
          p_match_id: parsed.data.matchId,
          p_ticket_code: payload.code,
          p_token_version: payload.version,
          p_steward_id: viewer.userId,
          p_gate_id: null,
          p_device_label: parsed.data.deviceLabel ?? null,
          p_token_fingerprint: tokenFingerprint,
        };

  const { data, error } = await supabase.rpc(rpcName, rpcPayload);

  if (error) {
    console.error("Eroare RPC la scanare.", error);

    return jsonResponse(
      {
        result: "invalid_token",
        message: "A aparut o eroare la validarea credentialului. Reincearca imediat.",
      },
      400,
    );
  }

  const result = scanResponseSchema.parse({
    result: data?.result ?? "invalid_token",
    message: data?.message ?? "Raspuns gol de la validare.",
    credentialKind: data?.credential_kind ?? payload.kind,
    ticketCode: data?.ticket_code ?? data?.subscription_code ?? null,
    matchTitle: data?.match_title ?? null,
    seatLabel: data?.seat_label ?? null,
    rowLabel: data?.row_label ?? null,
    seatNumber: data?.seat_number ?? null,
    sectorLabel: data?.sector_label ?? null,
    scannedAt: data?.scanned_at ?? null,
    holderName: data?.holder_name ?? null,
    holderBirthDate: data?.holder_birth_date ?? null,
  });

  return jsonResponse(result);
}
