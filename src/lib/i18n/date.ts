import { ro, ru } from "date-fns/locale";

import type { AppLocale } from "@/lib/i18n/config";

export function getDateFnsLocale(locale: AppLocale) {
  return locale === "ru" ? ru : ro;
}
