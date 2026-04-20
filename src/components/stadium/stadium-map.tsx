"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { SectorSeatMap } from "@/components/stadium/sector-seat-map";
import { StadiumLegend } from "@/components/stadium/stadium-legend";
import { StadiumMapRenderer } from "@/components/stadium/stadium-map-renderer";
import { StadiumTierView } from "@/components/stadium/stadium-tier-view";
import type { SeatMapSector } from "@/lib/domain/types";
import { resolveStadiumMapConfig } from "@/lib/stadium/stadium-config-registry";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";
import {
  buildRenderableSectors,
  getVisibleTribunes,
  getSectorLabel,
} from "@/lib/stadium/stadium-utils";

export function StadiumMap({
  stadiumId,
  stadiumName,
  stadiumSlug,
  mapKey,
  sectors,
  selectedSeatIds,
  disabled,
  onSeatToggle,
}: {
  stadiumId?: string | null;
  stadiumName: string;
  stadiumSlug?: string | null;
  mapKey?: string | null;
  sectors: SeatMapSector[];
  selectedSeatIds: string[];
  disabled?: boolean;
  onSeatToggle: (seatId: string, availability: string) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);

  const resolvedMap = useMemo(
    () =>
      resolveStadiumMapConfig(
        {
          stadiumId,
          stadiumName,
          stadiumSlug,
          mapKey,
        },
        sectors,
      ),
    [mapKey, sectors, stadiumId, stadiumName, stadiumSlug],
  );

  const visibleTribunes = useMemo(
    () => getVisibleTribunes(resolvedMap.config),
    [resolvedMap.config],
  );

  const renderableSectors = useMemo(
    () => buildRenderableSectors(resolvedMap.config, sectors, selectedSeatIds),
    [resolvedMap.config, sectors, selectedSeatIds],
  );

  const [selectedTribuneId, setSelectedTribuneId] = useState<string | null>(
    visibleTribunes[0]?.id ?? null,
  );
  const [selectedSectorCode, setSelectedSectorCode] = useState<string | null>(
    renderableSectors[0]?.config.code ?? null,
  );

  const effectiveTribuneId = useMemo(() => {
    if (!visibleTribunes.length) {
      return null;
    }

    if (selectedTribuneId && visibleTribunes.some((item) => item.id === selectedTribuneId)) {
      return selectedTribuneId;
    }

    return visibleTribunes[0].id;
  }, [selectedTribuneId, visibleTribunes]);

  const effectiveSectorCode = useMemo(() => {
    const sectorsForTribune = renderableSectors.filter(
      (sector) => sector.config.tribuneId === effectiveTribuneId,
    );

    if (
      selectedSectorCode &&
      sectorsForTribune.some((item) => item.config.code === selectedSectorCode)
    ) {
      return selectedSectorCode;
    }

    return sectorsForTribune[0]?.config.code ?? renderableSectors[0]?.config.code ?? null;
  }, [effectiveTribuneId, renderableSectors, selectedSectorCode]);

  const selectedRenderableSector =
    renderableSectors.find((sector) => sector.config.code === effectiveSectorCode) ?? null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
            {copy.overviewTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{stadiumName}</p>
        </div>
        <StadiumLegend mode="overview" />
      </div>

      <StadiumMapRenderer
        config={resolvedMap.config}
        sectors={renderableSectors}
        selectedSectorCode={effectiveSectorCode}
        isFallback={resolvedMap.isFallback}
        onSelectSector={(sectorCode) => {
          const nextSector = renderableSectors.find((sector) => sector.config.code === sectorCode);
          if (!nextSector) {
            return;
          }

          setSelectedSectorCode(sectorCode);
          setSelectedTribuneId(nextSector.config.tribuneId);
        }}
      />

      <StadiumTierView
        tribunes={visibleTribunes}
        selectedTribuneId={effectiveTribuneId}
        selectedSectorCode={effectiveSectorCode}
        sectors={renderableSectors}
        onSelectTribune={(tribuneId) => setSelectedTribuneId(tribuneId)}
        onSelectSector={(sectorCode) => {
          const nextSector = renderableSectors.find((sector) => sector.config.code === sectorCode);
          if (!nextSector) {
            return;
          }

          setSelectedSectorCode(sectorCode);
          setSelectedTribuneId(nextSector.config.tribuneId);
        }}
      />

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
              {copy.seatMapTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {selectedRenderableSector
                ? getSectorLabel(locale, selectedRenderableSector.config)
                : copy.noSectorSelected}
            </p>
          </div>
          <StadiumLegend mode="seat-map" />
        </div>

        <SectorSeatMap
          sector={selectedRenderableSector?.data ?? null}
          sectorConfig={selectedRenderableSector?.config ?? null}
          selectedSeatIds={selectedSeatIds}
          disabled={disabled}
          onSeatToggle={onSeatToggle}
        />
      </div>
    </div>
  );
}
