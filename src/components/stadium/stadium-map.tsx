"use client";

import { useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { SectorSeatMap } from "@/components/stadium/sector-seat-map";
import { StadiumLegend } from "@/components/stadium/stadium-legend";
import { StadiumMapRenderer } from "@/components/stadium/stadium-map-renderer";
import { StadiumTierView } from "@/components/stadium/stadium-tier-view";
import type { SeatMapSector } from "@/lib/domain/types";
import { resolveStadiumMapConfig } from "@/lib/stadium/stadium-config-registry";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";
import type { StadiumMapConfig } from "@/lib/stadium/stadium-types";
import {
  buildRenderableSectors,
  getVisibleTribunes,
  getSectorLabel,
  getTribuneLabel,
} from "@/lib/stadium/stadium-utils";
import { cn } from "@/lib/utils";

export function StadiumMap({
  stadiumId,
  stadiumName,
  stadiumSlug,
  mapKey,
  overrideConfig,
  sectors,
  selectedSeatIds,
  disabled,
  onSeatToggle,
}: {
  stadiumId?: string | null;
  stadiumName: string;
  stadiumSlug?: string | null;
  mapKey?: string | null;
  overrideConfig?: StadiumMapConfig | null;
  sectors: SeatMapSector[];
  selectedSeatIds: string[];
  disabled?: boolean;
  onSeatToggle: (seatId: string, availability: string) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);
  const seatMapRef = useRef<HTMLDivElement | null>(null);

  const resolvedMap = useMemo(
    () => {
      if (overrideConfig) {
        return {
          mapKey: overrideConfig.mapKey,
          config: overrideConfig,
          isFallback: false,
        };
      }

      return resolveStadiumMapConfig(
        {
          stadiumId,
          stadiumName,
          stadiumSlug,
          mapKey,
        },
        sectors,
      );
    },
    [mapKey, sectors, stadiumId, stadiumName, stadiumSlug, overrideConfig],
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

  function handleSelectSector(sectorCode: string) {
    const nextSector = renderableSectors.find((sector) => sector.config.code === sectorCode);
    if (!nextSector) {
      return;
    }

    setSelectedSectorCode(sectorCode);
    setSelectedTribuneId(nextSector.config.tribuneId);

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      window.setTimeout(() => {
        seatMapRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  }

  const currentTribuneLabel = effectiveTribuneId
    ? getTribuneLabel(
        locale,
        visibleTribunes.find((item) => item.id === effectiveTribuneId) ?? visibleTribunes[0],
      )
    : "-";

  const flowSteps = [
    {
      title: copy.flowStepOverviewTitle,
      description: copy.flowStepOverviewDescription,
      isActive: Boolean(effectiveTribuneId),
    },
    {
      title: copy.flowStepSectorTitle,
      description: copy.flowStepSectorDescription,
      isActive: Boolean(effectiveSectorCode),
    },
    {
      title: copy.flowStepSeatTitle,
      description: copy.flowStepSeatDescription,
      isActive: selectedSeatIds.length > 0,
    },
    {
      title: copy.flowStepCheckoutTitle,
      description: copy.flowStepCheckoutDescription,
      isActive: false,
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {flowSteps.map((step, index) => (
          <div
            key={step.title}
            className={cn(
              "rounded-[24px] border px-4 py-4 transition",
              step.isActive
                ? "border-[#dc2626] bg-[#fff1f2] shadow-[0_18px_36px_-24px_rgba(220,38,38,0.35)]"
                : "border-black/6 bg-neutral-50",
            )}
          >
            <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
              {step.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{step.description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {step.isActive
                ? copy.flowStepActive
                : index === 3
                  ? copy.continueAction
                  : copy.flowStepWaiting}
            </p>
          </div>
        ))}
      </div>

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
        onSelectSector={handleSelectSector}
      />

      <StadiumTierView
        tribunes={visibleTribunes}
        selectedTribuneId={effectiveTribuneId}
        selectedSectorCode={effectiveSectorCode}
        sectors={renderableSectors}
        onSelectTribune={(tribuneId) => setSelectedTribuneId(tribuneId)}
        onSelectSector={handleSelectSector}
      />

      <div className="grid gap-3 rounded-[28px] border border-black/6 bg-neutral-50 p-5 md:grid-cols-3">
        <div className="rounded-[22px] border border-black/6 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            {copy.currentTribune}
          </p>
          <p className="mt-2 font-semibold text-[#111111]">{currentTribuneLabel}</p>
        </div>
        <div className="rounded-[22px] border border-black/6 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            {copy.currentSector}
          </p>
          <p className="mt-2 font-semibold text-[#111111]">
            {selectedRenderableSector
              ? getSectorLabel(locale, selectedRenderableSector.config)
              : copy.noSectorSelected}
          </p>
        </div>
        <div className="rounded-[22px] border border-black/6 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            {copy.selectedSeatsCount}
          </p>
          <p className="mt-2 font-semibold text-[#111111]">{selectedSeatIds.length}</p>
        </div>
      </div>

      <div ref={seatMapRef} className="grid gap-4">
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
            <p className="mt-1 text-xs leading-5 text-neutral-500">{copy.tapSeatHint}</p>
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
