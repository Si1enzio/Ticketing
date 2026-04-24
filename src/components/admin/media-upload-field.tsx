"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MediaUploadFieldProps = {
  id: string;
  name: string;
  label: string;
  helpText: string;
  defaultPreviewUrl?: string | null;
  accept?: string;
  previewClassName?: string;
  required?: boolean;
  className?: string;
};

export function MediaUploadField({
  id,
  name,
  label,
  helpText,
  defaultPreviewUrl,
  accept = "image/*",
  previewClassName,
  required = false,
  className,
}: MediaUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultPreviewUrl ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="grid gap-3 rounded-[22px] border border-black/6 bg-neutral-50 p-4">
        <div
          className={cn(
            "overflow-hidden rounded-[18px] border border-dashed border-black/10 bg-white/80",
            previewClassName ?? "aspect-[16/9]",
          )}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-neutral-500">
              Nu exista inca o imagine incarcata.
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Input
            id={id}
            name={name}
            type="file"
            accept={accept}
            required={required}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                setObjectUrl(null);
              }

              if (!file) {
                setPreviewUrl(defaultPreviewUrl ?? null);
                return;
              }

              const nextObjectUrl = URL.createObjectURL(file);
              setObjectUrl(nextObjectUrl);
              setPreviewUrl(nextObjectUrl);
            }}
            className="rounded-2xl bg-white"
          />
          <p className="text-xs leading-relaxed text-neutral-500">{helpText}</p>
        </div>
      </div>
    </div>
  );
}
