"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { splitIsoToLocalDateTime } from "@/lib/date-time";

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
  startsAtDateName?: string;
  startsAtTimeName?: string;
  reservationOpensAtName?: string;
  reservationOpensAtDateName?: string;
  reservationOpensAtTimeName?: string;
  reservationClosesAtName?: string;
  reservationClosesAtDateName?: string;
  reservationClosesAtTimeName?: string;
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
  startsAtDateName = "startsAtDate",
  startsAtTimeName = "startsAtTime",
  reservationOpensAtName = "reservationOpensAt",
  reservationOpensAtDateName = "reservationOpensAtDate",
  reservationOpensAtTimeName = "reservationOpensAtTime",
  reservationClosesAtName = "reservationClosesAt",
  reservationClosesAtDateName = "reservationClosesAtDate",
  reservationClosesAtTimeName = "reservationClosesAtTime",
}: AdminMatchDerivedFieldsProps) {
  const initialStartDateTime = useMemo(() => {
    const split = splitIsoToLocalDateTime(defaultStartsAt);
    return {
      date: split.date,
      time: split.time || defaultStartTime,
    };
  }, [defaultStartsAt]);
  const initialOpensDateTime = useMemo(() => {
    const split = splitIsoToLocalDateTime(defaultReservationOpensAt);
    return {
      date: split.date,
      time: split.time || defaultOpensTime,
    };
  }, [defaultReservationOpensAt]);
  const initialClosesDateTime = useMemo(() => {
    const split = splitIsoToLocalDateTime(defaultReservationClosesAt);
    return {
      date: split.date,
      time: split.time || defaultClosesTime,
    };
  }, [defaultReservationClosesAt]);
  const [homeTeam, setHomeTeam] = useState(defaultHomeTeam);
  const [awayTeam, setAwayTeam] = useState(defaultAwayTeam);
  const [startsAtDate, setStartsAtDate] = useState(initialStartDateTime.date);
  const [startsAtTime, setStartsAtTime] = useState(initialStartDateTime.time);
  const [reservationOpensAtDate, setReservationOpensAtDate] = useState(
    initialOpensDateTime.date,
  );
  const [reservationOpensAtTime, setReservationOpensAtTime] = useState(
    initialOpensDateTime.time,
  );
  const [reservationClosesAtDate, setReservationClosesAtDate] = useState(
    initialClosesDateTime.date,
  );
  const [reservationClosesAtTime, setReservationClosesAtTime] = useState(
    initialClosesDateTime.time,
  );

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
      <input type="hidden" name={startsAtName} value={joinDateTime(startsAtDate, startsAtTime)} />
      <input
        type="hidden"
        name={reservationOpensAtName}
        value={joinDateTime(reservationOpensAtDate, reservationOpensAtTime)}
      />
      <input
        type="hidden"
        name={reservationClosesAtName}
        value={joinDateTime(reservationClosesAtDate, reservationClosesAtTime)}
      />

      <TextField
        id={`${formId}-home-team`}
        name={homeTeamName}
        label="Gazda"
        value={homeTeam}
        placeholder="Ex: Organizator / club gazda"
        listId={datalistId}
        onChange={setHomeTeam}
        required
      />
      <TextField
        id={`${formId}-away-team`}
        name={awayTeamName}
        label="Oaspeti"
        value={awayTeam}
        placeholder="Ex: Oaspete / artist / invitat"
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
        label="Start eveniment"
        dateName={startsAtDateName}
        timeName={startsAtTimeName}
        dateValue={startsAtDate}
        timeValue={startsAtTime}
        onDateChange={setStartsAtDate}
        onTimeChange={setStartsAtTime}
        required
      />
      <DateTimeFieldGroup
        prefix={`${formId}-reservation-opens`}
        label="Deschidere ticketing"
        dateName={reservationOpensAtDateName}
        timeName={reservationOpensAtTimeName}
        dateValue={reservationOpensAtDate}
        timeValue={reservationOpensAtTime}
        onDateChange={setReservationOpensAtDate}
        onTimeChange={setReservationOpensAtTime}
      />
      <DateTimeFieldGroup
        prefix={`${formId}-reservation-closes`}
        label="Inchidere ticketing"
        dateName={reservationClosesAtDateName}
        timeName={reservationClosesAtTimeName}
        dateValue={reservationClosesAtDate}
        timeValue={reservationClosesAtTime}
        onDateChange={setReservationClosesAtDate}
        onTimeChange={setReservationClosesAtTime}
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
  dateName,
  timeName,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  required = false,
}: {
  prefix: string;
  label: string;
  dateName: string;
  timeName: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2 md:col-span-2">
      <Label>{label}</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id={`${prefix}-date`}
          name={dateName}
          type="date"
          value={dateValue}
          onChange={(event) => onDateChange(event.target.value)}
          required={required}
          className="rounded-2xl bg-white"
        />
        <Input
          id={`${prefix}-time`}
          name={timeName}
          type="time"
          value={timeValue}
          onChange={(event) => onTimeChange(event.target.value)}
          required={required && Boolean(dateValue)}
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

function joinDateTime(date: string, time: string) {
  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00"}`;
}
