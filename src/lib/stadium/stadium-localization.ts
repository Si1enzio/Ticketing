import type { AppLocale } from "@/lib/i18n/config";
import type { LocalizedLabel } from "@/lib/stadium/stadium-types";

const stadiumMapMessages = {
  ro: {
    overviewTitle: "Overview stadion",
    overviewDescription:
      "Alege mai intai tribuna sau sectorul din harta, apoi continua cu selectia locurilor.",
    tribunesTitle: "Tribune",
    sectorsTitle: "Sectoare",
    seatMapTitle: "Harta sectorului",
    backToOverview: "Inapoi la stadion",
    backToTribune: "Inapoi la tribuna",
    selectedTribune: "Tribuna selectata",
    selectedSector: "Sector selectat",
    sectorUnavailable: "Sector indisponibil momentan",
    noSectorSelected: "Alege un sector din overview pentru a vedea locurile.",
    noSeatsAvailable: "Nu exista locuri afisabile pentru acest sector.",
    seatLegendAvailable: "Disponibil",
    seatLegendSelected: "Selectat",
    seatLegendHeld: "Blocat temporar",
    seatLegendSold: "Vandut / emis",
    seatLegendBlocked: "Blocat",
    mapLegendAvailable: "Bookabil",
    mapLegendLimited: "Capacitate redusa",
    mapLegendUnavailable: "Indisponibil",
    mapLegendHidden: "Ascuns",
    freeText: "Acces gratuit",
    row: "Rand",
    seat: "Loc",
    seats: "locuri",
    available: "disponibile",
    held: "hold",
    reserved: "rezervate",
    blocked: "blocate",
    stadiumFallback:
      "Stadionul nu are inca o geometrie custom. Afisam o harta generata automat din sectoarele existente.",
  },
  ru: {
    overviewTitle: "Obzor stadiona",
    overviewDescription:
      "Snachala vyberi tribunu ili sektor na karte, potom perehodi k vyboru mest.",
    tribunesTitle: "Tribuny",
    sectorsTitle: "Sektory",
    seatMapTitle: "Karta sektora",
    backToOverview: "Nazad k stadionu",
    backToTribune: "Nazad k tribune",
    selectedTribune: "Vybrannaya tribuna",
    selectedSector: "Vybrannyi sektor",
    sectorUnavailable: "Sektor vremenno nedostupen",
    noSectorSelected: "Vyberi sektor na obshchei karte, chtoby uvidet mesta.",
    noSeatsAvailable: "Dlya etogo sektora net otobrazhaemyh mest.",
    seatLegendAvailable: "Dostupno",
    seatLegendSelected: "Vybrano",
    seatLegendHeld: "Vremenno zablokirovano",
    seatLegendSold: "Prodano / vydano",
    seatLegendBlocked: "Zablokirovano",
    mapLegendAvailable: "Dostupen",
    mapLegendLimited: "Ogranicheno",
    mapLegendUnavailable: "Nedostupen",
    mapLegendHidden: "Skryt",
    freeText: "Besplatno",
    row: "Ryad",
    seat: "Mesto",
    seats: "mest",
    available: "dostupno",
    held: "hold",
    reserved: "zanyato",
    blocked: "zablokirovano",
    stadiumFallback:
      "U stadiona poka net individualnoi geometrii. Pokazyvaem avtomaticheski sformirovannuyu kartu.",
  },
} as const;

export function getStadiumMapMessages(locale: AppLocale) {
  return stadiumMapMessages[locale] ?? stadiumMapMessages.ro;
}

export function getLocalizedLabel(
  locale: AppLocale,
  fallback: string,
  labels?: LocalizedLabel,
) {
  return labels?.[locale] ?? labels?.ro ?? labels?.ru ?? fallback;
}
