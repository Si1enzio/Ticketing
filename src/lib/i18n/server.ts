import "server-only";

import { cookies } from "next/headers";

import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  type AppLocale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get(localeCookieName)?.value;

  return isAppLocale(storedLocale) ? storedLocale : defaultLocale;
}

export async function getServerI18n() {
  const locale = await getServerLocale();
  const messages = getMessages(locale);

  return {
    locale,
    messages,
  };
}
