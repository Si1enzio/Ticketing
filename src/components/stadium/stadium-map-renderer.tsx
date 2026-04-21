"use client";

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useI18n } from "@/components/i18n-provider";
import { StadiumSector } from "@/components/stadium/stadium-sector";
import { getDecorationProps } from "@/lib/stadium/stadium-geometry";
import { getStadiumMapMessages } from "@/lib/stadium/stadium-localization";
import type {
  DecorativeElement,
  StadiumMapConfig,
  StadiumRenderableSector,
} from "@/lib/stadium/stadium-types";
import { getSectorAvailabilityState } from "@/lib/stadium/stadium-utils";

export function StadiumMapRenderer({
  config,
  sectors,
  selectedSectorCode,
  isFallback,
  onSelectSector,
  editable,
  onSectorDrag,
  selectedDecorationId,
  onSelectDecoration,
  onDecorationDrag,
  onDecorationResize,
}: {
  config: StadiumMapConfig;
  sectors: StadiumRenderableSector[];
  selectedSectorCode?: string | null;
  isFallback?: boolean;
  onSelectSector: (sectorCode: string) => void;
  editable?: boolean;
  onSectorDrag?: (sectorCode: string, deltaX: number, deltaY: number) => void;
  selectedDecorationId?: string | null;
  onSelectDecoration?: (decorationId: string | null) => void;
  onDecorationDrag?: (decorationId: string, deltaX: number, deltaY: number) => void;
  onDecorationResize?: (decorationId: string, deltaX: number, deltaY: number) => void;
}) {
  const { locale } = useI18n();
  const copy = getStadiumMapMessages(locale);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<{
    pointerId: number;
    targetId: string;
    targetType: "sector" | "decoration-move" | "decoration-resize";
    lastX: number;
    lastY: number;
  } | null>(null);

  function toSvgCoordinates(event: ReactPointerEvent<Element>) {
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
      targetId: sectorCode,
      targetType: "sector",
      lastX: point.x,
      lastY: point.y,
    });
  }

  function handleDecorationPointerDown(
    decoration: DecorativeElement,
    event: ReactPointerEvent<SVGElement>,
  ) {
    if (!editable || !onDecorationDrag) {
      return;
    }

    const point = toSvgCoordinates(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectDecoration?.(decoration.id);
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      targetId: decoration.id,
      targetType: "decoration-move",
      lastX: point.x,
      lastY: point.y,
    });
  }

  function handleDecorationResizePointerDown(
    decorationId: string,
    event: ReactPointerEvent<SVGCircleElement>,
  ) {
    if (!editable || !onDecorationResize) {
      return;
    }

    const point = toSvgCoordinates(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectDecoration?.(decorationId);
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      targetId: decorationId,
      targetType: "decoration-resize",
      lastX: point.x,
      lastY: point.y,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
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

    if (dragState.targetType === "sector") {
      onSectorDrag?.(dragState.targetId, deltaX, deltaY);
    }

    if (dragState.targetType === "decoration-move") {
      onDecorationDrag?.(dragState.targetId, deltaX, deltaY);
    }

    if (dragState.targetType === "decoration-resize") {
      onDecorationResize?.(dragState.targetId, deltaX, deltaY);
    }

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

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!editable || !selectedSectorCode || !onSectorDrag) {
      return;
    }

    const step = event.shiftKey ? 10 : 2;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      onSectorDrag(selectedSectorCode, 0, -step);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      onSectorDrag(selectedSectorCode, 0, step);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onSectorDrag(selectedSectorCode, -step, 0);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      onSectorDrag(selectedSectorCode, step, 0);
    }
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

      <div
        className="overflow-hidden rounded-[28px] border border-black/6 bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]/40"
        tabIndex={editable ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
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
            const isSelectedDecoration = selectedDecorationId === element.id;

            if (!decoration) {
              return null;
            }

            if (decoration.type === "text") {
              return (
                <g key={element.id}>
                  <text
                    {...decoration.props}
                    className={editable ? "cursor-move" : undefined}
                    onPointerDown={(event) => handleDecorationPointerDown(element, event)}
                  >
                    {decoration.props.value}
                  </text>
                </g>
              );
            }

            if (decoration.type === "line") {
              return (
                <line
                  key={element.id}
                  {...decoration.props}
                  className={editable ? "cursor-move" : undefined}
                  onPointerDown={(event) => handleDecorationPointerDown(element, event)}
                />
              );
            }

            if (decoration.type === "rect" && element.kind === "rect") {
              return (
                <g key={element.id}>
                  <rect
                    {...decoration.props}
                    className={editable ? "cursor-move" : undefined}
                    onPointerDown={(event) => handleDecorationPointerDown(element, event)}
                  />
                  {editable ? (
                    <>
                      <rect
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        rx={element.rx ?? 0}
                        fill="transparent"
                        stroke={isSelectedDecoration ? "#dc2626" : "rgba(220,38,38,0.38)"}
                        strokeWidth={isSelectedDecoration ? 4 : 2}
                        strokeDasharray="10 8"
                        pointerEvents="none"
                      />
                      <circle
                        cx={element.x + element.width}
                        cy={element.y + element.height}
                        r={10}
                        fill={isSelectedDecoration ? "#dc2626" : "#ffffff"}
                        stroke="#dc2626"
                        strokeWidth={3}
                        className="cursor-se-resize"
                        onPointerDown={(event) =>
                          handleDecorationResizePointerDown(element.id, event)
                        }
                      />
                    </>
                  ) : null}
                </g>
              );
            }

            return (
              <path
                key={element.id}
                {...decoration.props}
                className={editable ? "cursor-move" : undefined}
                onPointerDown={(event) => handleDecorationPointerDown(element, event)}
              />
            );
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
