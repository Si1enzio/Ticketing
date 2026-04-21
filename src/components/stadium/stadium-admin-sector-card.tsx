"use client";

import { useState } from "react";

import {
  deleteSectorAction,
  moveSectorOrderAction,
  updateSectorAction,
} from "@/lib/actions/admin";
import type { StadiumSeat } from "@/lib/domain/types";
import { SeatFlagEditor } from "@/components/seat-flag-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SectorOption = {
  value: string;
  label: string;
};

type AdminSectorCardProps = {
  sector: {
    id: string;
    standId: string | null;
    gateId: string | null;
    gateName: string | null;
    name: string;
    code: string;
    color: string;
    rowsCount: number;
    seatsPerRow: number;
    seats: StadiumSeat[];
  };
  stadiumId: string;
  standOptions: SectorOption[];
  gateOptions: SectorOption[];
};

export function StadiumAdminSectorCard({
  sector,
  stadiumId,
  standOptions,
  gateOptions,
}: AdminSectorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="grid gap-4 rounded-[24px] border border-black/6 bg-white/90 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-4 w-4 rounded-full" style={{ backgroundColor: sector.color }} />
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
              {sector.code} - {sector.rowsCount} randuri / {sector.seatsPerRow} locuri pe rand
            </p>
            <p className="mt-1 font-semibold text-[#111111]">{sector.name}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Poarta implicita: {sector.gateName ?? "Fara poarta alocata"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <SectorMoveButtons sectorId={sector.id} source="stadion" />
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#111111] bg-white text-[#111111]"
            onClick={() => setIsExpanded((current) => !current)}
          >
            Setare / editare locuri
          </Button>
          <form action={deleteSectorAction}>
            <input type="hidden" name="sectorId" value={sector.id} />
            <Button
              type="submit"
              variant="destructive"
              className="rounded-full border border-[#b91c1c] bg-[#fff1f2] px-5 text-[#b91c1c] hover:bg-[#ffe4e6]"
            >
              Sterge sectorul
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-black/10 bg-white text-[#111111]"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? "Detalii ^" : "Detalii v"}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="grid gap-5 border-t border-black/6 pt-4">
          <form action={updateSectorAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <input type="hidden" name="sectorId" value={sector.id} />
            <input type="hidden" name="stadiumId" value={stadiumId} />
            <SelectField
              name={`sector-stand-${sector.id}`}
              htmlName="standId"
              label="Tribuna"
              allowEmpty
              emptyLabel="Fara tribuna"
              options={standOptions}
              defaultValue={sector.standId ?? ""}
            />
            <SelectField
              name={`sector-gate-${sector.id}`}
              htmlName="gateId"
              label="Poarta implicita"
              allowEmpty
              emptyLabel="Fara poarta alocata"
              options={gateOptions}
              defaultValue={sector.gateId ?? ""}
            />
            <Field
              name={`sector-name-${sector.id}`}
              htmlName="name"
              label="Nume sector"
              defaultValue={sector.name}
            />
            <Field
              name={`sector-code-${sector.id}`}
              htmlName="code"
              label="Cod"
              defaultValue={sector.code}
            />
            <Field
              name={`sector-color-${sector.id}`}
              htmlName="color"
              label="Culoare"
              defaultValue={sector.color}
            />
            <Field
              name={`sector-rows-${sector.id}`}
              htmlName="rowsCount"
              label="Numar randuri"
              type="number"
              defaultValue={String(sector.rowsCount)}
            />
            <Field
              name={`sector-seats-${sector.id}`}
              htmlName="seatsPerRow"
              label="Locuri / rand"
              type="number"
              defaultValue={String(sector.seatsPerRow)}
            />
            <div className="flex items-end xl:col-span-1">
              <Button
                type="submit"
                className="w-full rounded-full border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Salveaza sectorul
              </Button>
            </div>
          </form>

          <div className="rounded-[24px] border border-dashed border-black/10 bg-neutral-50 p-4">
            <SeatFlagEditor seats={sector.seats} sectorName={sector.name} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectorMoveButtons({
  sectorId,
  source,
}: {
  sectorId: string;
  source: "stadion" | "builder";
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={moveSectorOrderAction}>
        <input type="hidden" name="sectorId" value={sectorId} />
        <input type="hidden" name="direction" value="up" />
        <input type="hidden" name="source" value={source} />
        <Button
          type="submit"
          variant="outline"
          className="rounded-full border-black/10 bg-white text-[#111111]"
        >
          Sus
        </Button>
      </form>
      <form action={moveSectorOrderAction}>
        <input type="hidden" name="sectorId" value={sectorId} />
        <input type="hidden" name="direction" value="down" />
        <input type="hidden" name="source" value={source} />
        <Button
          type="submit"
          variant="outline"
          className="rounded-full border-black/10 bg-white text-[#111111]"
        >
          Jos
        </Button>
      </form>
    </div>
  );
}

function Field({
  name,
  htmlName,
  label,
  type = "text",
  defaultValue,
  required = true,
}: {
  name: string;
  htmlName?: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={htmlName ?? name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded-2xl bg-white"
      />
    </div>
  );
}

function SelectField({
  name,
  htmlName,
  label,
  options,
  defaultValue,
  allowEmpty = false,
  emptyLabel = "Selecteaza",
}: {
  name: string;
  htmlName?: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={htmlName ?? name}
        defaultValue={defaultValue}
        className="h-10 rounded-2xl border border-black/8 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#dc2626]"
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
