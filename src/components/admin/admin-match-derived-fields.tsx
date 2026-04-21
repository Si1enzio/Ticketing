"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminMatchDerivedFieldsProps = {
  formId: string;
  defaultHomeTeam: string;
  defaultAwayTeam: string;
  teamSuggestions?: string[];
  defaultStartsAt?: string | null;
  defaultReservationOpensAt?: string | null;
  defaultReservationClosesAt?: string | null;
  homeTeamName?: string;
  awayTeamName?: string;
  titleName?: string;
  slugName?: string;
  opponentNameName?: string;
  startsAtName?: string;
  reservationOpensAtName?: string;
  reservationClosesAtName?: string;
};

type SplitDateTime = {
  date: string;
  time: string;
};

const defaultStartTime = "18:00";
const defaultOpensTime = "10:00";
const defaultClosesTime = "23:59";

export function AdminMatchDerivedFields({
  formId,
  defaultHomeTeam,
  defaultAwayTeam,
  teamSuggestions = [],
  defaultStartsAt,
  defaultReservationOpensAt,
  defaultReservationClosesAt,
  homeTeamName = "homeTeam",
  awayTeamName = "awayTeam",
  titleName = "title",
  slugName = "slug",
  opponentNameName = "opponentName",
  startsAtName = "startsAt",
  reservationOpensAtName = "reservationOpensAt",
  reservationClosesAtName = "reservationClosesAt",
}: AdminMatchDerivedFieldsProps) {
  const [homeTeam, setHomeTeam] = useState(defaultHomeTeam);
  const [awayTeam, setAwayTeam] = useState(defaultAwayTeam);

  const [startDateTime, setStartDateTime] = useState<SplitDateTime>(() => {
    const split = splitDateTime(defaultStartsAt);
    return {
      date: split.date,
      time: split.time || defaultStartTime,
    };
  });
  const [opensDateTime, setOpensDateTime] = useState<SplitDateTime>(() => {
    const split = splitDateTime(defaultReservationOpensAt);
    return {
      date: split.date,
      time: split.time || defaultOpensTime,
    };
  });
  const [closesDateTime, setClosesDateTime] = useState<SplitDateTime>(() => {
    const split = splitDateTime(defaultReservationClosesAt);
    return {
      date: split.date,
      time: split.time || defaultClosesTime,
    };
  });

  const generatedTitle = useMemo(
    () => buildMatchTitle(homeTeam, awayTeam),
    [awayTeam, homeTeam],
  );
  const generatedSlug = useMemo(() => slugifyMatchTitle(generatedTitle), [generatedTitle]);
  const datalistId = `${formId}-team-suggestions`;

  return (
    <>
      <input type="hidden" name={titleName} value={generatedTitle} />
      <input type="hidden" name={slugName} value={generatedSlug} />
      <input type="hidden" name={opponentNameName} value={awayTeam.trim()} />
      <input type="hidden" name={startsAtName} value={joinDateTime(startDateTime)} />
      <input
        type="hidden"
        name={reservationOpensAtName}
        value={joinDateTime(opensDateTime)}
      />
      <input
        type="hidden"
        name={reservationClosesAtName}
        value={joinDateTime(closesDateTime)}
      />

      <TextField
        id={`${formId}-home-team`}
        name={homeTeamName}
        label="Gazda"
        value={homeTeam}
        placeholder="Ex: FC Milsami Orhei"
        listId={datalistId}
        onChange={setHomeTeam}
        required
      />
      <TextField
        id={`${formId}-away-team`}
        name={awayTeamName}
        label="Oaspeti"
        value={awayTeam}
        placeholder="Ex: FC Petrocub Hancesti"
        listId={datalistId}
        onChange={setAwayTeam}
        required
      />
      <TextField
        id={`${formId}-generated-title`}
        label="Titlu generat automat"
        value={generatedTitle}
        readOnly
      />
      <TextField
        id={`${formId}-generated-slug`}
        label="Slug generat automat"
        value={generatedSlug}
        readOnly
      />

      <DateTimeFieldGroup
        prefix={`${formId}-starts-at`}
        label="Start meci"
        value={startDateTime}
        onChange={setStartDateTime}
        required
      />
      <DateTimeFieldGroup
        prefix={`${formId}-reservation-opens`}
        label="Deschidere ticketing"
        value={opensDateTime}
        onChange={setOpensDateTime}
      />
      <DateTimeFieldGroup
        prefix={`${formId}-reservation-closes`}
        label="Inchidere ticketing"
        value={closesDateTime}
        onChange={setClosesDateTime}
      />

      {teamSuggestions.length ? (
        <datalist id={datalistId}>
          {Array.from(new Set(teamSuggestions.map((team) => team.trim()).filter(Boolean))).map(
            (teamName) => (
              <option key={teamName} value={teamName} />
            ),
          )}
        </datalist>
      ) : null}
    </>
  );
}

function TextField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  listId,
  readOnly = false,
  required = false,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  listId?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
        readOnly={readOnly}
        required={required}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="rounded-2xl bg-white"
      />
    </div>
  );
}

function DateTimeFieldGroup({
  prefix,
  label,
  value,
  onChange,
  required = false,
}: {
  prefix: string;
  label: string;
  value: SplitDateTime;
  onChange: (value: SplitDateTime) => void;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2 md:col-span-2">
      <Label>{label}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id={`${prefix}-date`}
          type="date"
          value={value.date}
          required={required}
          onChange={(event) =>
            onChange({
              ...value,
              date: event.target.value,
            })
          }
          className="rounded-2xl bg-white"
        />
        <Input
          id={`${prefix}-time`}
          type="time"
          value={value.time}
          required={required && Boolean(value.date)}
          onChange={(event) =>
            onChange({
              ...value,
              time: event.target.value,
            })
          }
          className="rounded-2xl bg-white"
        />
      </div>
    </div>
  );
}

function buildMatchTitle(homeTeam: string, awayTeam: string) {
  const home = homeTeam.trim();
  const away = awayTeam.trim();

  if (!home && !away) {
    return "";
  }

  if (!home) {
    return away;
  }

  if (!away) {
    return home;
  }

  return `${home} vs ${away}`;
}

function slugifyMatchTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitDateTime(value?: string | null): SplitDateTime {
  if (!value) {
    return { date: "", time: "" };
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);
    const iso = localDate.toISOString();

    return {
      date: iso.slice(0, 10),
      time: iso.slice(11, 16),
    };
  }

  const [datePart = "", timePart = ""] = value.split("T");
  return {
    date: datePart,
    time: timePart.slice(0, 5),
  };
}

function joinDateTime(value: SplitDateTime) {
  if (!value.date) {
    return "";
  }

  return `${value.date}T${value.time || "00:00"}`;
}
