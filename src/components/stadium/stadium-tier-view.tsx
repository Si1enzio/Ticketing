"use client";

import { useI18n } from "@/components/i18n-provider";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";
import type {
  StadiumRenderableSector,
  TribuneConfig,
} from "@/lib/stadium/stadium-types";
import { getSectorLabel, getTribuneLabel } from "@/lib/stadium/stadium-utils";
import { cn } from "@/lib/utils";

export function StadiumTierView({
  tribunes,
  selectedTribuneId,
  selectedSectorCode,
  sectors,
  onSelectTribune,
  onSelectSector,
}: {
  tribunes: TribuneConfig[];
  selectedTribuneId: string | null;
  selectedSectorCode: string | null;
  sectors: StadiumRenderableSector[];
  onSelectTribune: (tribuneId: string) => void;
  onSelectSector: (sectorCode: string) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);

  const activeTribune = tribunes.find((tribune) => tribune.id === selectedTribuneId) ?? null;
  const sectorsForTribune = activeTribune
    ? sectors.filter((sector) => sector.config.tribuneId === activeTribune.id)
    : [];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
            {copy.tribunesTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {copy.selectedTribune}:{" "}
            <span className="font-semibold text-[#111111]">
              {activeTribune ? getTribuneLabel(locale, activeTribune) : "-"}
            </span>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {tribunes.map((tribune) => {
            const isActive = tribune.id === selectedTribuneId;
            return (
              <button
                key={tribune.id}
                type="button"
                onClick={() => onSelectTribune(tribune.id)}
                className={cn(
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  isActive
                    ? "border-[#dc2626] bg-[#fff1f2] shadow-[0_18px_36px_-24px_rgba(220,38,38,0.5)]"
                    : "border-black/6 bg-white hover:border-[#dc2626]/30 hover:bg-[#fff7f7]",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: tribune.color }}
                  />
                  <div>
                    <p className="font-semibold text-[#111111]">
                      {getTribuneLabel(locale, tribune)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                      {tribune.sectorCodes.length} {copy.sectorsTitle.toLowerCase()}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
              {copy.sectorsTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {activeTribune
                ? getTribuneLabel(locale, activeTribune)
                : copy.overviewDescription}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sectorsForTribune.map((sector) => {
            const summary = sector.summary;
            const isSelected = selectedSectorCode === sector.config.code;

            return (
              <button
                key={sector.config.code}
                type="button"
                onClick={() => onSelectSector(sector.config.code)}
                className={cn(
                  "rounded-[22px] border px-3 py-3 text-left transition",
                  isSelected
                    ? "border-[#dc2626] bg-[#fff1f2] shadow-[0_18px_36px_-24px_rgba(220,38,38,0.5)]"
                    : "border-black/6 bg-white hover:border-[#dc2626]/30 hover:bg-[#fff7f7]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: sector.data?.color ?? "#9ca3af" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#111111]">
                        {getSectorLabel(locale, sector.config)}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                        {sector.config.code}
                      </p>
                    </div>
                  </div>
                  {summary ? (
                    <span className="rounded-full border border-black/6 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
                      {summary.availableSeats} {copy.available}
                    </span>
                  ) : null}
                </div>

                {summary ? null : (
                  <div className="mt-3 rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-3 py-3 text-sm text-[#b91c1c]">
                    {copy.sectorUnavailable}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
