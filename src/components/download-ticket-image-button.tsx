"use client";

import { ImageDown } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DownloadTicketImageButton({ imageUrl }: { imageUrl: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.open(`${imageUrl}?download=1`, "_blank", "noopener,noreferrer")}
      className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
    >
      <ImageDown className="mr-2 h-4 w-4" />
      Descarca imagine
    </Button>
  );
}
