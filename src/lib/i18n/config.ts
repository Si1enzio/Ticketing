export const appLocales = ["ro", "ru"] as const;

export type AppLocale = (typeof appLocales)[number];

export const defaultLocale: AppLocale = "ro";
export const localeCookieName = "preferred_locale";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && appLocales.includes(value as AppLocale));
}
