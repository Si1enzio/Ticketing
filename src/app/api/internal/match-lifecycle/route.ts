import { NextResponse } from "next/server";

import { syncMatchLifecycleStatuses } from "@/lib/match-lifecycle";

export async function GET() {
  await syncMatchLifecycleStatuses({ force: true });

  return NextResponse.json({
    ok: true,
    message: "Lifecycle sincronizat.",
  });
}
