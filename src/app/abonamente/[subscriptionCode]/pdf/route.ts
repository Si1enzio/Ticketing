import type { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { SubscriptionDocument } from "@/lib/pdf/subscription-document";
import { generateSubscriptionQrDataUrl } from "@/lib/security/tickets";
import { getSubscriptionByCode, getViewerContext } from "@/lib/supabase/queries";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/abonamente/[subscriptionCode]/pdf">,
) {
  const { subscriptionCode } = await context.params;
  const viewer = await getViewerContext();
  const subscription = await getSubscriptionByCode(subscriptionCode, viewer);

  if (!subscription) {
    return new Response("Abonament inexistent.", { status: 404 });
  }

  const qrDataUrl = await generateSubscriptionQrDataUrl({
    code: subscription.subscriptionCode,
    version: subscription.qrTokenVersion,
    kind: "subscription",
  });
  const buffer = await renderToBuffer(SubscriptionDocument({ subscription, qrDataUrl }));
  const url = new URL(request.url);
  const shouldDownload = url.searchParams.get("download") === "1";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${subscription.subscriptionCode}.pdf"`,
    },
  });
}
