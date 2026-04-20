"use client";

import { I18nProvider } from "@/components/i18n-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { AppLocale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: AppLocale;
  messages: AppMessages;
}) {
  return (
    <I18nProvider initialLocale={locale} messages={messages}>
      <TooltipProvider delayDuration={180}>
        {children}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </I18nProvider>
  );
}
