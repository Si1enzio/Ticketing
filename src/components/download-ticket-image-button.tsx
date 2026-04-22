"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DownloadTicketImageButton({ imageUrl }: { imageUrl: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const response = await fetch(`${imageUrl}?download=1`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Imaginea biletului nu a putut fi generata.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename=\"?([^\";]+)\"?/)?.[1] ?? "bilet.png";

      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      toast.error("Imaginea biletului nu a putut fi descarcata acum.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDownload}
      disabled={isDownloading}
      className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
    >
      <ImageDown className="mr-2 h-4 w-4" />
      {isDownloading ? "Se pregateste..." : "Descarca imagine"}
    </Button>
  );
}
