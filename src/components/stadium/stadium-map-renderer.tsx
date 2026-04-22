"use client";

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Minus, Plus } from "lucide-react";

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

function FootballPitchLines({
  x,
  y,
  width,
  height,
  rx = 0,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}) {
  const padding = Math.max(10, Math.min(width, height) * 0.055);
  const left = x + padding;
  const right = x + width - padding;
  const top = y + padding;
  const bottom = y + height - padding;
  const innerWidth = right - left;
  const innerHeight = bottom - top;
  const midX = left + innerWidth / 2;
  const midY = top + innerHeight / 2;
  const centerCircleRadius = Math.min(innerWidth, innerHeight) * 0.12;
  const penaltyBoxDepth = innerWidth * 0.16;
  const penaltyBoxHeight = innerHeight * 0.5;
  const goalAreaDepth = innerWidth * 0.06;
  const goalAreaHeight = innerHeight * 0.22;
  const penaltySpotOffset = innerWidth * 0.11;
  const stroke = "rgba(21,128,61,0.22)";
  const strokeWidth = Math.max(1.5, Math.min(width, height) * 0.006);

  return (
    <g pointerEvents="none">
      <rect
        x={left}
        y={top}
        width={innerWidth}
        height={innerHeight}
        rx={Math.max(0, rx - padding * 0.35)}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <line
        x1={midX}
        y1={top}
        x2={midX}
        y2={bottom}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={midX}
        cy={midY}
        r={centerCircleRadius}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle cx={midX} cy={midY} r={strokeWidth * 0.75} fill={stroke} />

      <rect
        x={left}
        y={midY - penaltyBoxHeight / 2}
        width={penaltyBoxDepth}
        height={penaltyBoxHeight}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <rect
        x={left}
        y={midY - goalAreaHeight / 2}
        width={goalAreaDepth}
        height={goalAreaHeight}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle cx={left + penaltySpotOffset} cy={midY} r={strokeWidth * 0.75} fill={stroke} />

      <rect
        x={right - penaltyBoxDepth}
        y={midY - penaltyBoxHeight / 2}
        width={penaltyBoxDepth}
        height={penaltyBoxHeight}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <rect
        x={right - goalAreaDepth}
        y={midY - goalAreaHeight / 2}
        width={goalAreaDepth}
        height={goalAreaHeight}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle cx={right - penaltySpotOffset} cy={midY} r={strokeWidth * 0.75} fill={stroke} />
    </g>
  );
}

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
  const zoomViewportRef = useRef<HTMLDivElement | null>(null);
  const pinchStateRef = useRef<{
    startDistance: number;
    startZoom: number;
  } | null>(null);
  const suppressSectorClickRef = useRef(false);
  const [dragState, setDragState] = useState<{
    pointerId: number;
    targetId: string;
    targetType: "sector" | "decoration-move" | "decoration-resize";
    lastX: number;
    lastY: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mousePanState, setMousePanState] = useState<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  function clampZoom(value: number) {
    return Math.min(2.5, Math.max(1, value));
  }

  function updateZoom(nextZoom: number) {
    setZoomLevel(clampZoom(nextZoom));
  }

  function getTouchDistance(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      return null;
    }

    const [firstTouch, secondTouch] = [event.touches[0], event.touches[1]];
    return Math.hypot(
      secondTouch.clientX - firstTouch.clientX,
      secondTouch.clientY - firstTouch.clientY,
    );
  }

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
    if (!editable || !onSectorDrag) {
      return;
    }

    onSelectSector(sectorCode);

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

  function handleSectorClick(sectorCode: string) {
    if (suppressSectorClickRef.current) {
      suppressSectorClickRef.current = false;
      return;
    }

    onSelectSector(sectorCode);
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
          <p className="mt-1 text-xs leading-5 text-neutral-500">{copy.zoomHint}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => updateZoom(zoomLevel - 0.2)}
            disabled={zoomLevel <= 1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#111111] transition hover:border-[#dc2626]/30 hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={copy.zoomOut}
            title={copy.zoomOut}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => updateZoom(1)}
            disabled={zoomLevel === 1}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#111111] transition hover:border-[#dc2626]/30 hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={copy.zoomReset}
            title={copy.zoomReset}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={() => updateZoom(zoomLevel + 0.2)}
            disabled={zoomLevel >= 2.5}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#111111] transition hover:border-[#dc2626]/30 hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={copy.zoomIn}
            title={copy.zoomIn}
          >
            <Plus className="h-4 w-4" />
          </button>
          {isFallback ? (
            <div className="max-w-sm rounded-[22px] border border-black/6 bg-white px-4 py-3 text-xs leading-5 text-neutral-500">
              {copy.stadiumFallback}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[28px] border border-black/6 bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]/40"
        tabIndex={editable ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={zoomViewportRef}
          className="overflow-auto rounded-[24px]"
          onMouseDown={(event) => {
            if (editable || zoomLevel <= 1 || event.button !== 0 || !zoomViewportRef.current) {
              return;
            }

            setMousePanState({
              startX: event.clientX,
              startY: event.clientY,
              scrollLeft: zoomViewportRef.current.scrollLeft,
              scrollTop: zoomViewportRef.current.scrollTop,
            });
            suppressSectorClickRef.current = false;
          }}
          onMouseMove={(event) => {
            if (!mousePanState || !zoomViewportRef.current) {
              return;
            }

            const deltaX = event.clientX - mousePanState.startX;
            const deltaY = event.clientY - mousePanState.startY;

            if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
              suppressSectorClickRef.current = true;
            }

            zoomViewportRef.current.scrollLeft = mousePanState.scrollLeft - deltaX;
            zoomViewportRef.current.scrollTop = mousePanState.scrollTop - deltaY;
          }}
          onMouseUp={() => {
            setMousePanState(null);
            window.setTimeout(() => {
              suppressSectorClickRef.current = false;
            }, 0);
          }}
          onMouseLeave={() => {
            setMousePanState(null);
          }}
          onTouchStart={(event) => {
            const distance = getTouchDistance(event);
            if (!distance) {
              pinchStateRef.current = null;
              return;
            }

            pinchStateRef.current = {
              startDistance: distance,
              startZoom: zoomLevel,
            };
          }}
          onTouchMove={(event) => {
            const pinchState = pinchStateRef.current;
            const distance = getTouchDistance(event);
            if (!pinchState || !distance) {
              return;
            }

            event.preventDefault();
            updateZoom(pinchState.startZoom * (distance / pinchState.startDistance));
          }}
          onTouchEnd={(event) => {
            if (event.touches.length < 2) {
              pinchStateRef.current = null;
            }
          }}
          style={{ cursor: !editable && zoomLevel > 1 ? (mousePanState ? "grabbing" : "grab") : "default" }}
        >
          <div
            className="mx-auto origin-top transition-[width] duration-150 ease-out"
            style={{
              width: `${zoomLevel * 100}%`,
              minWidth: zoomLevel > 1 ? `${zoomLevel * 100}%` : "100%",
            }}
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
                const isFootballPitch =
              element.kind === "rect" &&
              (element.preset === "football-pitch" || /pitch|teren/i.test(element.id));

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
                  {isFootballPitch ? (
                    <FootballPitchLines
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                      rx={element.rx}
                    />
                  ) : null}
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
                  onClick={() => handleSectorClick(sector.config.code)}
                  onPointerDown={(event) => handleSectorPointerDown(sector.config.code, event)}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
