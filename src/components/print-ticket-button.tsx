"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintTicketButton({ pdfUrl }: { pdfUrl: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
      className="rounded-full border-[#111111] bg-white text-[#111111] hover:bg-neutral-100"
    >
      <Printer className="mr-2 h-4 w-4" />
      Printeaza
    </Button>
  );
}
