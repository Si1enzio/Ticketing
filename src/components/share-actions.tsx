"use client";

import { toast } from "sonner";
import { Mail, Printer, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareActions({
  title,
  ticketUrl,
  pdfUrl,
}: {
  title: string;
  ticketUrl: string;
  pdfUrl: string;
}) {
  async function handleNativeShare() {
    if (!navigator.share) {
      window.open(ticketUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await navigator.share({
        title,
        text: `Bilet electronic pentru ${title}`,
        url: ticketUrl,
      });
    } catch {
      toast.error("Partajarea nativă a fost anulată.");
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        onClick={handleNativeShare}
        className="rounded-full bg-[#11552d] hover:bg-[#0e4524]"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Partajează
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
        className="rounded-full"
      >
        <Printer className="mr-2 h-4 w-4" />
        PDF / tipărire
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          window.open(
            `https://wa.me/?text=${encodeURIComponent(`Bilet: ${ticketUrl}`)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
        className="rounded-full"
      >
        <Send className="mr-2 h-4 w-4" />
        WhatsApp
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          window.open(
            `https://t.me/share/url?url=${encodeURIComponent(ticketUrl)}&text=${encodeURIComponent(title)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
        className="rounded-full"
      >
        <Send className="mr-2 h-4 w-4" />
        Telegram
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          window.open(
            `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(ticketUrl)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
        className="rounded-full sm:col-span-2"
      >
        <Mail className="mr-2 h-4 w-4" />
        Trimite prin email
      </Button>
    </div>
  );
}

