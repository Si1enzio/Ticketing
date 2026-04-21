"use client";

import { useMemo, useState } from "react";

import { saveStadiumMapConfigAction } from "@/lib/actions/admin";
import type { StadiumBuilder } from "@/lib/domain/types";
import {
  resizeRectDecoration,
  translateDecoration,
  translateSectorShape,
} from "@/lib/stadium/stadium-geometry";
import { stadiumMapConfigSchema } from "@/lib/stadium/stadium-schema";
import type { StadiumMapConfig } from "@/lib/stadium/stadium-types";
import { buildRenderableSectors, convertStadiumBuilderSectorsToSeatMap, createFallbackStadiumMapConfig } from "@/lib/stadium/stadium-utils";
import { StadiumLegend } from "@/components/stadium/stadium-legend";
import { StadiumMapRenderer } from "@/components/stadium/stadium-map-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type StadiumMapConfigRecord = {
  stadiumId: string;
  mapKey: string;
  isActive: boolean;
  config: StadiumMapConfig;
};

function buildInitialConfig(stadium: StadiumBuilder, saved?: StadiumMapConfig | null) {
  if (saved) {
    return saved;
  }

  return createFallbackStadiumMapConfig({
    mapKey: stadium.slug,
    stadiumName: stadium.name,
    sectors: convertStadiumBuilderSectorsToSeatMap(stadium),
  });
}

export function StadiumMapAdminEditor({
  stadiums,
  configs,
}: {
  stadiums: StadiumBuilder[];
  configs: StadiumMapConfigRecord[];
}) {
  const [selectedStadiumId, setSelectedStadiumId] = useState(stadiums[0]?.id ?? "");

  const selectedStadium = useMemo(
    () => stadiums.find((stadium) => stadium.id === selectedStadiumId) ?? stadiums[0] ?? null,
    [selectedStadiumId, stadiums],
  );

  const savedConfig = useMemo(
    () => configs.find((config) => config.stadiumId === selectedStadium?.id)?.config ?? null,
    [configs, selectedStadium?.id],
  );

  const [configByStadium, setConfigByStadium] = useState<Record<string, StadiumMapConfig>>(() =>
    Object.fromEntries(
      stadiums.map((stadium) => {
        const stored = configs.find((config) => config.stadiumId === stadium.id)?.config ?? null;
        const initial = buildInitialConfig(stadium, stored);
        return [stadium.id, initial];
      }),
    ),
  );
  const [rawJsonByStadium, setRawJsonByStadium] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      stadiums.map((stadium) => {
        const stored = configs.find((config) => config.stadiumId === stadium.id)?.config ?? null;
        const initial = buildInitialConfig(stadium, stored);
        return [stadium.id, JSON.stringify(initial, null, 2)];
      }),
    ),
  );
  const [selectedPreviewSectorCode, setSelectedPreviewSectorCode] = useState<string | null>(null);
  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const config = selectedStadium ? configByStadium[selectedStadium.id] ?? buildInitialConfig(selectedStadium, savedConfig) : null;
  const rawJson = selectedStadium ? rawJsonByStadium[selectedStadium.id] ?? (config ? JSON.stringify(config, null, 2) : "") : "";

  const previewSectors = useMemo(
    () => (selectedStadium ? convertStadiumBuilderSectorsToSeatMap(selectedStadium) : []),
    [selectedStadium],
  );

  const renderableSectors = useMemo(
    () => (config ? buildRenderableSectors(config, previewSectors, []) : []),
    [config, previewSectors],
  );
  const effectivePreviewSectorCode =
    selectedPreviewSectorCode &&
    renderableSectors.some((sector) => sector.config.code === selectedPreviewSectorCode)
      ? selectedPreviewSectorCode
      : renderableSectors[0]?.config.code ?? null;

  function patchConfig(updater: (current: StadiumMapConfig) => StadiumMapConfig) {
    if (!selectedStadium || !config) {
      return;
    }

    const next = updater(config);
    setConfigByStadium((current) => ({
      ...current,
      [selectedStadium.id]: next,
    }));
    setRawJsonByStadium((current) => ({
      ...current,
      [selectedStadium.id]: JSON.stringify(next, null, 2),
    }));
  }

  function applyRawJson() {
    if (!selectedStadium) {
      return;
    }

    try {
      const parsed = stadiumMapConfigSchema.parse(JSON.parse(rawJson));
      setConfigByStadium((current) => ({
        ...current,
        [selectedStadium.id]: parsed,
      }));
      setJsonError(null);
    } catch (error) {
      console.error("Configuratie JSON invalida pentru editorul stadionului.", error);
      setJsonError(
        "JSON invalid. Verifica viewBox, sectoarele si shape-urile inainte de salvare.",
      );
    }
  }

  if (!selectedStadium || !config) {
    return (
      <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-6 text-sm text-neutral-500">
        Nu exista inca stadioane configurate.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-[28px] border border-black/6 bg-neutral-50 p-5 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="map-editor-stadium">Stadion</Label>
            <select
              id="map-editor-stadium"
              value={selectedStadiumId}
              onChange={(event) => setSelectedStadiumId(event.target.value)}
              className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
            >
              {stadiums.map((stadium) => (
                <option key={stadium.id} value={stadium.id}>
                  {stadium.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="map-key">Map key</Label>
            <Input
              id="map-key"
              value={config.mapKey}
              onChange={(event) =>
                patchConfig((current) => ({
                  ...current,
                  mapKey: event.target.value,
                }))
              }
              className="rounded-2xl bg-white"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="map-label">Titlu harta</Label>
            <Input
              id="map-label"
              value={config.defaultLabel}
              onChange={(event) =>
                patchConfig((current) => ({
                  ...current,
                  defaultLabel: event.target.value,
                }))
              }
              className="rounded-2xl bg-white"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <NumberField
              label="viewBox width"
              value={config.viewBox.width}
              onChange={(value) =>
                patchConfig((current) => ({
                  ...current,
                  viewBox: { ...current.viewBox, width: value },
                }))
              }
            />
            <NumberField
              label="viewBox height"
              value={config.viewBox.height}
              onChange={(value) =>
                patchConfig((current) => ({
                  ...current,
                  viewBox: { ...current.viewBox, height: value },
                }))
              }
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#111111] bg-white text-[#111111]"
              onClick={() => {
                const next = createFallbackStadiumMapConfig({
                  mapKey: selectedStadium.slug,
                  stadiumName: selectedStadium.name,
                  sectors: previewSectors,
                });
                setConfigByStadium((current) => ({
                  ...current,
                  [selectedStadium.id]: next,
                }));
                setRawJsonByStadium((current) => ({
                  ...current,
                  [selectedStadium.id]: JSON.stringify(next, null, 2),
                }));
                setSelectedPreviewSectorCode(next.sectors[0]?.code ?? null);
                setJsonError(null);
              }}
            >
              Genereaza config initial
            </Button>
            <p className="self-center text-xs leading-5 text-neutral-500">
              Porneste de la structura reala a stadionului si ajusteaza apoi sectoarele.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
                Preview overview
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Harta SVG folosita in fluxul public al meciului.
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Poti trage cu cursorul sectoarele de tip `rectangle`, `trapezoid`, `curve`,
                `polygon` sau `arc`. Terenul si alte elemente decorative `rect` pot fi mutate,
                iar terenul poate fi si redimensionat din handle-ul rosu din colt. Pentru
                `custom-path`, ajustezi path-ul sau label-ul din configuratie.
              </p>
            </div>
            <StadiumLegend mode="overview" />
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/6 bg-white p-3">
            <StadiumMapRenderer
              config={config}
              sectors={renderableSectors}
              selectedSectorCode={effectivePreviewSectorCode}
              onSelectSector={(sectorCode) => setSelectedPreviewSectorCode(sectorCode)}
              selectedDecorationId={selectedDecorationId}
              onSelectDecoration={setSelectedDecorationId}
              editable
              onSectorDrag={(sectorCode, deltaX, deltaY) => {
                setSelectedPreviewSectorCode(sectorCode);
                patchConfig((current) => ({
                  ...current,
                  sectors: current.sectors.map((item) =>
                    item.code === sectorCode
                      ? {
                          ...item,
                          shape: translateSectorShape(item.shape, deltaX, deltaY),
                        }
                      : item,
                  ),
                }));
              }}
              onDecorationDrag={(decorationId, deltaX, deltaY) => {
                setSelectedDecorationId(decorationId);
                patchConfig((current) => ({
                  ...current,
                  decorations: current.decorations?.map((item) =>
                    item.id === decorationId
                      ? translateDecoration(item, deltaX, deltaY)
                      : item,
                  ),
                }));
              }}
              onDecorationResize={(decorationId, deltaX, deltaY) => {
                setSelectedDecorationId(decorationId);
                patchConfig((current) => ({
                  ...current,
                  decorations: current.decorations?.map((item) =>
                    item.id === decorationId && item.kind === "rect"
                      ? resizeRectDecoration(item, deltaX, deltaY)
                      : item,
                  ),
                }));
              }}
            />
          </div>
        </div>
      </div>

      {selectedDecorationId && config.decorations?.some((item) => item.id === selectedDecorationId) ? (
        <div className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
              Element decorativ selectat
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Poti ajusta rapid terenul sau alte decoratiuni direct din preview si din campurile de mai jos.
            </p>
          </div>

          {config.decorations
            .filter((item) => item.id === selectedDecorationId)
            .map((item) => (
              <div key={item.id} className="grid gap-4">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>ID</Label>
                    <Input value={item.id} readOnly className="rounded-2xl bg-neutral-50" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tip</Label>
                    <Input value={item.kind} readOnly className="rounded-2xl bg-neutral-50" />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#111111] bg-white text-[#111111]"
                      onClick={() => setSelectedDecorationId(null)}
                    >
                      Deselecteaza
                    </Button>
                  </div>
                </div>

                {item.kind === "rect" ? (
                  <div className="grid gap-3 md:grid-cols-5">
                    <NumberField
                      label="x"
                      value={item.x}
                      onChange={(value) =>
                        patchConfig((current) => ({
                          ...current,
                          decorations: current.decorations?.map((decoration) =>
                            decoration.id === item.id && decoration.kind === "rect"
                              ? { ...decoration, x: value }
                              : decoration,
                          ),
                        }))
                      }
                    />
                    <NumberField
                      label="y"
                      value={item.y}
                      onChange={(value) =>
                        patchConfig((current) => ({
                          ...current,
                          decorations: current.decorations?.map((decoration) =>
                            decoration.id === item.id && decoration.kind === "rect"
                              ? { ...decoration, y: value }
                              : decoration,
                          ),
                        }))
                      }
                    />
                    <NumberField
                      label="width"
                      value={item.width}
                      onChange={(value) =>
                        patchConfig((current) => ({
                          ...current,
                          decorations: current.decorations?.map((decoration) =>
                            decoration.id === item.id && decoration.kind === "rect"
                              ? { ...decoration, width: value }
                              : decoration,
                          ),
                        }))
                      }
                    />
                    <NumberField
                      label="height"
                      value={item.height}
                      onChange={(value) =>
                        patchConfig((current) => ({
                          ...current,
                          decorations: current.decorations?.map((decoration) =>
                            decoration.id === item.id && decoration.kind === "rect"
                              ? { ...decoration, height: value }
                              : decoration,
                          ),
                        }))
                      }
                    />
                    <NumberField
                      label="rx"
                      value={item.rx ?? 0}
                      onChange={(value) =>
                        patchConfig((current) => ({
                          ...current,
                          decorations: current.decorations?.map((decoration) =>
                            decoration.id === item.id && decoration.kind === "rect"
                              ? { ...decoration, rx: value }
                              : decoration,
                          ),
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      ) : null}

      <div className="grid gap-4">
        {config.sectors.map((sector, index) => (
          <div
            key={`${sector.code}-${index}`}
            className="grid gap-4 rounded-[28px] border border-black/6 bg-white p-5"
          >
            <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr_1fr]">
              <div className="grid gap-2">
                <Label>Cod sector</Label>
                <Input
                  value={sector.code}
                  onChange={(event) =>
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, code: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-2xl bg-white"
                />
              </div>
              <div className="grid gap-2">
                <Label>Label sector</Label>
                <Input
                  value={sector.defaultLabel}
                  onChange={(event) =>
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, defaultLabel: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  className="rounded-2xl bg-white"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tribuna</Label>
                <select
                  value={sector.tribuneId}
                  onChange={(event) =>
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, tribuneId: event.target.value } : item,
                      ),
                    }))
                  }
                  className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
                >
                  {config.tribunes.map((tribune) => (
                    <option key={tribune.id} value={tribune.id}>
                      {tribune.defaultLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Shape</Label>
                <select
                  value={sector.shape.type}
                  onChange={(event) => {
                    const nextType = event.target.value as StadiumMapConfig["sectors"][number]["shape"]["type"];
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) => {
                        if (itemIndex !== index) {
                          return item;
                        }

                        if (nextType === item.shape.type) {
                          return item;
                        }

                        return {
                          ...item,
                          shape:
                            nextType === "trapezoid"
                              ? {
                                  type: "trapezoid",
                                  x: 100,
                                  y: 100,
                                  topWidth: 160,
                                  bottomWidth: 220,
                                  height: 120,
                                }
                              : nextType === "custom-path"
                                ? {
                                    type: "custom-path",
                                    path: "M 100 100 L 220 100 L 220 220 L 100 220 Z",
                                  }
                                : {
                                    type: "rectangle",
                                    x: 100,
                                    y: 100,
                                    width: 180,
                                    height: 120,
                                    rx: 18,
                                  },
                        };
                      }),
                    }));
                  }}
                  className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
                >
                  <option value="rectangle">rectangle</option>
                  <option value="trapezoid">trapezoid</option>
                  <option value="custom-path">custom-path</option>
                </select>
              </div>
            </div>

            {sector.shape.type === "rectangle" ? (
              <div className="grid gap-3 md:grid-cols-5">
                <NumberField label="x" value={sector.shape.x} onChange={(value) => updateSectorShapeNumber(index, "x", value, patchConfig)} />
                <NumberField label="y" value={sector.shape.y} onChange={(value) => updateSectorShapeNumber(index, "y", value, patchConfig)} />
                <NumberField label="width" value={sector.shape.width} onChange={(value) => updateSectorShapeNumber(index, "width", value, patchConfig)} />
                <NumberField label="height" value={sector.shape.height} onChange={(value) => updateSectorShapeNumber(index, "height", value, patchConfig)} />
                <NumberField label="rx" value={sector.shape.rx ?? 0} onChange={(value) => updateSectorShapeNumber(index, "rx", value, patchConfig)} />
              </div>
            ) : null}

            {sector.shape.type === "trapezoid" ? (
              <div className="grid gap-3 md:grid-cols-6">
                <NumberField label="x" value={sector.shape.x} onChange={(value) => updateSectorShapeNumber(index, "x", value, patchConfig)} />
                <NumberField label="y" value={sector.shape.y} onChange={(value) => updateSectorShapeNumber(index, "y", value, patchConfig)} />
                <NumberField label="topWidth" value={sector.shape.topWidth} onChange={(value) => updateSectorShapeNumber(index, "topWidth", value, patchConfig)} />
                <NumberField label="bottomWidth" value={sector.shape.bottomWidth} onChange={(value) => updateSectorShapeNumber(index, "bottomWidth", value, patchConfig)} />
                <NumberField label="height" value={sector.shape.height} onChange={(value) => updateSectorShapeNumber(index, "height", value, patchConfig)} />
                <NumberField label="skew" value={sector.shape.skew ?? 0} onChange={(value) => updateSectorShapeNumber(index, "skew", value, patchConfig)} />
              </div>
            ) : null}

            {sector.shape.type === "custom-path" ? (
              <div className="grid gap-2">
                <Label>SVG path</Label>
                <Textarea
                  value={sector.shape.path}
                  onChange={(event) =>
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              shape: {
                                ...item.shape,
                                type: "custom-path",
                                path: event.target.value,
                              },
                            }
                          : item,
                      ),
                    }))
                  }
                  rows={3}
                  className="rounded-2xl bg-white font-mono text-xs"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-5 text-sm text-neutral-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sector.isVisible !== false}
                  onChange={(event) =>
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, isVisible: event.target.checked }
                          : item,
                      ),
                    }))
                  }
                />
                Vizibil in map
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sector.isBookable !== false}
                  onChange={(event) =>
                    patchConfig((current) => ({
                      ...current,
                      sectors: current.sectors.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, isBookable: event.target.checked }
                          : item,
                      ),
                    }))
                  }
                />
                Bookabil
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 rounded-[28px] border border-black/6 bg-neutral-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b91c1c]">
              JSON avansat
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Daca ai nevoie de `polygon`, `arc`, `curve-left/right`, tiers sau elemente decorative complexe, le poti edita direct aici.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#111111] bg-white text-[#111111]"
            onClick={applyRawJson}
          >
            Aplica JSON
          </Button>
        </div>

        <Textarea
          value={rawJson}
          onChange={(event) =>
            selectedStadium
              ? setRawJsonByStadium((current) => ({
                  ...current,
                  [selectedStadium.id]: event.target.value,
                }))
              : undefined
          }
          rows={18}
          className="rounded-2xl bg-white font-mono text-xs"
        />
        {jsonError ? <p className="text-sm text-[#b91c1c]">{jsonError}</p> : null}

        <form action={saveStadiumMapConfigAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="stadiumId" value={selectedStadium.id} />
          <input type="hidden" name="mapKey" value={config.mapKey} />
          <input type="hidden" name="configJson" value={JSON.stringify(config)} />
          <Button
            type="submit"
            className="rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
          >
            Salveaza configuratia hartii
          </Button>
          <p className="text-sm text-neutral-500">
            Configuratia salvata aici este folosita de overview map-ul public pentru meciurile acestui stadion.
          </p>
        </form>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-2xl bg-white"
      />
    </div>
  );
}

function updateSectorShapeNumber(
  sectorIndex: number,
  key: string,
  value: number,
  patchConfig: (updater: (current: StadiumMapConfig) => StadiumMapConfig) => void,
) {
  patchConfig((current) => ({
    ...current,
    sectors: current.sectors.map((item, itemIndex) => {
      if (itemIndex !== sectorIndex) {
        return item;
      }

      if (item.shape.type === "rectangle") {
        return {
          ...item,
          shape: {
            ...item.shape,
            [key]: value,
          },
        };
      }

      if (item.shape.type === "trapezoid") {
        return {
          ...item,
          shape: {
            ...item.shape,
            [key]: value,
          },
        };
      }

      return item;
    }),
  }));
}
