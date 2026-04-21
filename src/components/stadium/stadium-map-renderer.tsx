"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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
  editable,
  onSectorDrag,
}: {
  config: StadiumMapConfig;
  sectors: StadiumRenderableSector[];
  selectedSectorCode?: string | null;
  isFallback?: boolean;
  onSelectSector: (sectorCode: string) => void;
  editable?: boolean;
  onSectorDrag?: (sectorCode: string, deltaX: number, deltaY: number) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<{
    pointerId: number;
    sectorCode: string;
    lastX: number;
    lastY: number;
  } | null>(null);

  function toSvgCoordinates(event: ReactPointerEvent<SVGSVGElement | SVGGElement>) {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    return {
      x: config.viewBox.minX + ((event.clientX - rect.left) / rect.width) * config.viewBox.width,
      y: config.viewBox.minY + ((event.clientY - rect.top) / rect.height) * config.viewBox.height,
    };
  }

  function handleSectorPointerDown(
    sectorCode: string,
    event: ReactPointerEvent<SVGGElement>,
  ) {
    onSelectSector(sectorCode);

    if (!editable || !onSectorDrag) {
      return;
    }

    const point = toSvgCoordinates(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      sectorCode,
      lastX: point.x,
      lastY: point.y,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId || !onSectorDrag) {
      return;
    }

    const point = toSvgCoordinates(event);
    if (!point) {
      return;
    }

    const deltaX = point.x - dragState.lastX;
    const deltaY = point.y - dragState.lastY;

    if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
      return;
    }

    onSectorDrag(dragState.sectorCode, deltaX, deltaY);
    setDragState((current) =>
      current
        ? {
            ...current,
            lastX: point.x,
            lastY: point.y,
          }
        : null,
    );
  }

  function handlePointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }

    setDragState(null);
  }

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
          ref={svgRef}
          viewBox={`${config.viewBox.minX} ${config.viewBox.minY} ${config.viewBox.width} ${config.viewBox.height}`}
          className="h-auto w-full"
          role="img"
          aria-label={config.defaultLabel}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={(event) => {
            if (!dragState) {
              return;
            }

            handlePointerEnd(event);
          }}
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
              onPointerDown={(event) => handleSectorPointerDown(sector.config.code, event)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
