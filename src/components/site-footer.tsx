"use client";

import { useI18n } from "@/components/i18n-provider";

export function SiteFooter() {
  const { t, messages } = useI18n();

  return (
    <footer className="border-t border-black/8 bg-[#0B1A33]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-neutral-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="font-medium text-white">{t("footer.title")}</p>
          <p>{t("footer.description")}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-neutral-300">
          {messages.footer.pills.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
