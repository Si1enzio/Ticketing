import Image from "next/image";

import type { UserSubscription } from "@/lib/domain/types";
import { generateSubscriptionQrDataUrl } from "@/lib/security/tickets";

export async function SubscriptionQr({
  subscription,
}: {
  subscription: UserSubscription;
}) {
  const src = await generateSubscriptionQrDataUrl({
    code: subscription.subscriptionCode,
    version: subscription.qrTokenVersion,
    kind: "subscription",
  });

  return (
    <Image
      src={src}
      alt={`QR pentru abonamentul ${subscription.subscriptionCode}`}
      width={224}
      height={224}
      unoptimized
      className="h-56 w-56 rounded-[2rem] border border-black/8 bg-white p-3 shadow-[0_20px_50px_-36px_rgba(23,23,23,0.32)]"
    />
  );
}
