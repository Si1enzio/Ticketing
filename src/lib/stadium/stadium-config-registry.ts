import { orheiStadiumMapConfig } from "@/data/stadiums/orhei";
import type {
  StadiumMapLookup,
  StadiumMapRegistryEntry,
  StadiumMapResolved,
} from "@/lib/stadium/stadium-types";
import { normalizeStadiumMapKey, createFallbackStadiumMapConfig } from "@/lib/stadium/stadium-utils";
import type { SeatMapSector } from "@/lib/domain/types";

const registry: StadiumMapRegistryEntry[] = [
  {
    mapKey: orheiStadiumMapConfig.mapKey,
    stadiumAliases: [
      "stadionul-municipal-orhei",
      "stadionul municipal orhei",
      "municipal stadium orhei",
      "stadionul municipal \"orhei\"",
      "stadionul municipal orhei",
    ],
    config: orheiStadiumMapConfig,
  },
];

export function getStadiumMapRegistryEntry(lookup: StadiumMapLookup) {
  const candidates = [
    lookup.mapKey,
    lookup.stadiumSlug,
    lookup.stadiumName,
    lookup.stadiumId,
  ]
    .map((value) => normalizeStadiumMapKey(value))
    .filter(Boolean) as string[];

  return registry.find((entry) => {
    const aliases = [entry.mapKey, ...entry.stadiumAliases].map((value) =>
      normalizeStadiumMapKey(value),
    );

    return candidates.some((candidate) => aliases.includes(candidate));
  });
}

export function resolveStadiumMapConfig(
  lookup: StadiumMapLookup,
  sectors: SeatMapSector[],
): StadiumMapResolved {
  const entry = getStadiumMapRegistryEntry(lookup);

  if (entry) {
    return {
      mapKey: entry.mapKey,
      config: entry.config,
      isFallback: false,
    };
  }

  const fallbackKey =
    normalizeStadiumMapKey(lookup.mapKey) ||
    normalizeStadiumMapKey(lookup.stadiumSlug) ||
    normalizeStadiumMapKey(lookup.stadiumName) ||
    "generic-stadium";

  return {
    mapKey: fallbackKey,
    config: createFallbackStadiumMapConfig({
      mapKey: fallbackKey,
      stadiumName: lookup.stadiumName ?? "Stadium",
      sectors,
    }),
    isFallback: true,
  };
}

export function getRegisteredStadiumMaps() {
  return [...registry];
}
