"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { completeDemoCheckoutAction } from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";

export function DemoCheckoutButton({
  matchId,
  holdToken,
}: {
  matchId: string;
  holdToken: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCheckout() {
    startTransition(async () => {
      const result = await completeDemoCheckoutAction({
        matchId,
        holdToken,
      });

      if (!result.ok || !result.reservationId) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(`/confirmare/${result.reservationId}`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={handleCheckout}
      disabled={isPending}
      className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
    >
      {isPending ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Confirma plata si emite biletele
    </Button>
  );
}
