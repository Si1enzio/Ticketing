"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MediaUploadFieldProps = {
  id: string;
  label: string;
  helpText: string;
  hiddenName: string;
  uploadFolder: string;
  mediaKind: "poster" | "banner";
  defaultPreviewUrl?: string | null;
  accept?: string;
  previewClassName?: string;
  required?: boolean;
  className?: string;
  maxFileSizeBytes?: number;
};

export function MediaUploadField({
  id,
  label,
  helpText,
  hiddenName,
  uploadFolder,
  mediaKind,
  defaultPreviewUrl,
  accept = "image/*",
  previewClassName,
  required = false,
  className,
  maxFileSizeBytes = 12 * 1024 * 1024,
}: MediaUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultPreviewUrl ?? null);
  const [uploadedUrl, setUploadedUrl] = useState(defaultPreviewUrl ?? "");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statusId = useId();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    const form = inputRef.current?.closest("form");

    if (!form) {
      return;
    }

    const handleSubmit = (event: Event) => {
      if (!isUploading) {
        return;
      }

      event.preventDefault();
      setErrorMessage("Asteapta finalizarea incarcarii imaginii, apoi salveaza din nou.");
    };

    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, [isUploading]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={hiddenName} value={uploadedUrl} />
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
            type="file"
            accept={accept}
            required={required}
            ref={inputRef}
            aria-describedby={statusId}
            onChange={async (event) => {
              const inputElement = event.currentTarget;
              const file = event.currentTarget.files?.[0] ?? null;
              setErrorMessage(null);
              setUploadNotice(null);

              if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                setObjectUrl(null);
              }

              if (!file) {
                setPreviewUrl(defaultPreviewUrl ?? null);
                setUploadedUrl(defaultPreviewUrl ?? "");
                return;
              }

              if (file.size > maxFileSizeBytes) {
                setPreviewUrl(defaultPreviewUrl ?? null);
                setErrorMessage(
                  `Fisierul este prea mare. Limita maxima pentru acest camp este ${(maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB.`,
                );
                inputElement.value = "";
                return;
              }

              if (!file.type.startsWith("image/")) {
                setPreviewUrl(defaultPreviewUrl ?? null);
                setErrorMessage("Poti incarca doar fisiere imagine.");
                inputElement.value = "";
                return;
              }

              const nextObjectUrl = URL.createObjectURL(file);
              setObjectUrl(nextObjectUrl);
              setPreviewUrl(nextObjectUrl);

              setIsUploading(true);

              try {
                const uploadedMediaUrl = await uploadEventMedia({
                  file,
                  uploadFolder,
                  mediaKind,
                  supabase,
                });

                setUploadedUrl(uploadedMediaUrl);
                setPreviewUrl(uploadedMediaUrl);
                setUploadNotice("Imaginea a fost incarcata. Poti salva evenimentul.");
                inputElement.value = "";
              } catch (error) {
                console.error("Upload media esuat.", error);
                setPreviewUrl(defaultPreviewUrl ?? null);
                setUploadedUrl(defaultPreviewUrl ?? "");
                setErrorMessage(
                  error instanceof Error
                    ? `Imaginea nu a putut fi incarcata: ${error.message}`
                    : "Imaginea nu a putut fi incarcata. Incearca din nou.",
                );
              } finally {
                setIsUploading(false);
              }
            }}
            className="rounded-2xl bg-white"
          />
          <p id={statusId} className="text-xs leading-relaxed text-neutral-500">
            {helpText}
          </p>
          {isUploading ? (
            <p className="text-xs font-medium text-amber-700">Se incarca imaginea...</p>
          ) : null}
          {uploadNotice ? (
            <p className="text-xs font-medium text-emerald-700">{uploadNotice}</p>
          ) : null}
          {errorMessage ? <p className="text-xs font-medium text-red-600">{errorMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

async function uploadEventMedia({
  file,
  uploadFolder,
  mediaKind,
  supabase,
}: {
  file: File;
  uploadFolder: string;
  mediaKind: "poster" | "banner";
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
}) {
  const directUploadError = await tryBrowserStorageUpload({
    file,
    uploadFolder,
    mediaKind,
    supabase,
  });

  if (directUploadError.ok) {
    return directUploadError.url;
  }

  const uploadFormData = new FormData();
  uploadFormData.set("file", file);
  uploadFormData.set("uploadFolder", uploadFolder);
  uploadFormData.set("mediaKind", mediaKind);

  const response = await fetch("/api/admin/event-media/upload", {
    method: "POST",
    body: uploadFormData,
    credentials: "same-origin",
  });

  const result = (await response.json().catch(() => null)) as
    | { ok?: boolean; url?: string; message?: string }
    | null;

  if (!response.ok || !result?.ok || !result.url) {
    const fallbackMessage = result?.message || "Imaginea nu a putut fi incarcata.";
    const combinedMessage = directUploadError.message
      ? `${fallbackMessage} (${directUploadError.message})`
      : fallbackMessage;
    throw new Error(combinedMessage);
  }

  return result.url;
}

async function tryBrowserStorageUpload({
  file,
  uploadFolder,
  mediaKind,
  supabase,
}: {
  file: File;
  uploadFolder: string;
  mediaKind: "poster" | "banner";
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
}): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!supabase) {
    return {
      ok: false,
      message: "Clientul de upload din browser nu este disponibil.",
    };
  }

  const extension = getFileExtension(file);
  const path = `${sanitizePathSegment(uploadFolder || "matches/drafts")}/${mediaKind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("event-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) {
    return {
      ok: false,
      message: uploadError.message,
    };
  }

  const { data } = supabase.storage.from("event-media").getPublicUrl(path);

  return {
    ok: true,
    url: data.publicUrl,
  };
}

function getFileExtension(file: File) {
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  return mimeToExtension[file.type] ?? file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+|-+$/g, "");
}
