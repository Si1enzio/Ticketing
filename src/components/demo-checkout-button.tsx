"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, LoaderCircle, TicketPlus } from "lucide-react";
import { toast } from "sonner";

import { completeDemoCheckoutAction, confirmSeatHoldAction } from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";

export function DemoCheckoutButton({
  matchId,
  holdToken,
  ticketingMode,
}: {
  matchId: string;
  holdToken: string;
  ticketingMode: "free" | "paid";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCheckout() {
    startTransition(async () => {
      const result =
        ticketingMode === "paid"
          ? await completeDemoCheckoutAction({
              matchId,
              holdToken,
            })
          : await confirmSeatHoldAction({
              matchId,
              holdToken,
              source: "public_reservation",
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
        <>
          {ticketingMode === "paid" ? (
            <CreditCard className="mr-2 h-4 w-4" />
          ) : (
            <TicketPlus className="mr-2 h-4 w-4" />
          )}
        </>
      )}
      {ticketingMode === "paid"
        ? "Confirma plata si emite biletele"
        : "Confirma emiterea biletelor"}
    </Button>
  );
}
