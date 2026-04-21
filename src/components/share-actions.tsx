"use client";

import { toast } from "sonner";
import { DownloadCloud, ImageDown, Mail, Printer, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareActions({
  title,
  ticketUrl,
  pdfUrl,
  imageUrl,
}: {
  title: string;
  ticketUrl: string;
  pdfUrl: string;
  imageUrl: string;
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
      toast.error("Partajarea nativa a fost anulata.");
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        onClick={handleNativeShare}
        className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Partajeaza pagina
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => window.open(`${pdfUrl}?download=1`, "_blank", "noopener,noreferrer")}
        className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
      >
        <DownloadCloud className="mr-2 h-4 w-4" />
        Descarca PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => window.open(`${imageUrl}?download=1`, "_blank", "noopener,noreferrer")}
        className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
      >
        <ImageDown className="mr-2 h-4 w-4" />
        Descarca imagine
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
        className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
      >
        <Printer className="mr-2 h-4 w-4" />
        Printeaza
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
        className="rounded-full border-black/8 bg-neutral-50 text-[#111111] hover:bg-neutral-100"
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
        className="rounded-full border-black/8 bg-neutral-50 text-[#111111] hover:bg-neutral-100"
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
        className="rounded-full border-black/8 bg-neutral-50 text-[#111111] hover:bg-neutral-100 sm:col-span-2"
      >
        <Mail className="mr-2 h-4 w-4" />
        Trimite prin email
      </Button>
    </div>
  );
}
