"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  appLocales,
  defaultLocale,
  isAppLocale,
  localeCookieName,
  type AppLocale,
} from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/translate";

type I18nContextValue = {
  locale: AppLocale;
  messages: AppMessages;
  setLocale: (locale: AppLocale) => void;
  t: (key: string) => string;
  locales: typeof appLocales;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
  messages,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
  messages: AppMessages;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>(
    isAppLocale(initialLocale) ? initialLocale : defaultLocale,
  );

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      messages,
      locales: appLocales,
      t: (key: string) => translate(messages, key),
      setLocale: (nextLocale) => {
        document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        setLocaleState(nextLocale);
        router.refresh();
      },
    };
  }, [locale, messages, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n trebuie folosit in interiorul I18nProvider.");
  }

  return context;
}
