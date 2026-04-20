"use client";

import { useI18n } from "@/components/i18n-provider";
import { StadiumSector } from "@/components/stadium/stadium-sector";
import { getDecorationProps } from "@/lib/stadium/stadium-geometry";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";
import type { StadiumMapConfig, StadiumRenderableSector } from "@/lib/stadium/stadium-types";
import { getSectorAvailabilityState } from "@/lib/stadium/stadium-utils";

export function StadiumMapRenderer({
  config,
  sectors,
  selectedSectorCode,
  isFallback,
  onSelectSector,
}: {
  config: StadiumMapConfig;
  sectors: StadiumRenderableSector[];
  selectedSectorCode?: string | null;
  isFallback?: boolean;
  onSelectSector: (sectorCode: string) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);

  return (
    <div className="grid gap-4 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
            {copy.overviewTitle}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            {copy.overviewDescription}
          </p>
        </div>
        {isFallback ? (
          <div className="max-w-sm rounded-[22px] border border-black/6 bg-white px-4 py-3 text-xs leading-5 text-neutral-500">
            {copy.stadiumFallback}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-black/6 bg-white p-3">
        <svg
          viewBox={`${config.viewBox.minX} ${config.viewBox.minY} ${config.viewBox.width} ${config.viewBox.height}`}
          className="h-auto w-full"
          role="img"
          aria-label={config.defaultLabel}
        >
          {config.decorations?.map((element) => {
            const decoration = getDecorationProps(element);

            if (!decoration) {
              return null;
            }

            if (decoration.type === "text") {
              return (
                <text key={element.id} {...decoration.props}>
                  {decoration.props.value}
                </text>
              );
            }

            if (decoration.type === "line") {
              return <line key={element.id} {...decoration.props} />;
            }

            if (decoration.type === "rect") {
              return <rect key={element.id} {...decoration.props} />;
            }

            return <path key={element.id} {...decoration.props} />;
          })}

          {sectors.map((sector) => (
            <StadiumSector
              key={sector.config.code}
              sector={sector}
              state={getSectorAvailabilityState(sector.summary)}
              isSelected={selectedSectorCode === sector.config.code}
              onClick={() => onSelectSector(sector.config.code)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
