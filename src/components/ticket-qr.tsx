import Image from "next/image";
import QRCode from "qrcode";

import type { TicketCard } from "@/lib/domain/types";
import { signTicketToken } from "@/lib/security/tickets";

export async function TicketQr({
  ticket,
}: {
  ticket: TicketCard;
}) {
  const qrToken = await signTicketToken({
    code: ticket.ticketCode,
    matchId: ticket.matchId,
    version: ticket.qrTokenVersion,
    kind: "ticket",
  });

  const src = await QRCode.toDataURL(qrToken, {
    margin: 1,
    color: {
      dark: "#08140f",
      light: "#fffaf0",
    },
  });

  return (
    <Image
      src={src}
      alt={`QR pentru biletul ${ticket.ticketCode}`}
      width={224}
      height={224}
      unoptimized
      className="h-56 w-56 rounded-[2rem] border border-[#d5a021]/20 bg-white p-3"
    />
  );
}
