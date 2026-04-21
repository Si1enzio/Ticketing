"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
type ButtonSize = React.ComponentProps<typeof Button>["size"];

type ConfirmButtonProps = {
  triggerLabel: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  submitForm?: boolean;
  onConfirm?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  confirmVariant?: ButtonVariant;
  confirmClassName?: string;
  disabled?: boolean;
};

export function ConfirmButton({
  triggerLabel,
  title,
  description,
  confirmLabel = "Confirma",
  cancelLabel = "Renunta",
  submitForm = false,
  onConfirm,
  variant = "outline",
  size = "default",
  className,
  confirmVariant = "destructive",
  confirmClassName,
  disabled = false,
}: ConfirmButtonProps) {
  const [open, setOpen] = React.useState(false);
  const submitButtonRef = React.useRef<HTMLButtonElement | null>(null);

  function handleConfirm() {
    if (submitForm) {
      submitButtonRef.current?.click();
    } else {
      onConfirm?.();
    }
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      {submitForm ? (
        <button
          ref={submitButtonRef}
          type="submit"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
        />
      ) : null}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmVariant}
              className={confirmClassName}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
