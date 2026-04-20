import type { AppMessages } from "@/lib/i18n/messages";

function resolvePath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (typeof current === "object" && current !== null && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

export function translate(messages: AppMessages, key: string) {
  const value = resolvePath(messages, key);

  return typeof value === "string" ? value : key;
}
