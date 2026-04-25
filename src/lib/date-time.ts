export const DEFAULT_EVENT_TIME_ZONE = "Europe/Chisinau";

export type LocalDateTimeParts = {
  date: string;
  time: string;
};

function buildLocalDateTimeFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
}

function buildOffsetFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "longOffset",
  });
}

function extractDateTimeParts(parts: Intl.DateTimeFormatPart[]) {
  const values = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") {
      acc[part.type] = part.value;
    }

    return acc;
  }, {});

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const timeZoneName = buildOffsetFormatter(timeZone)
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const normalized = timeZoneName?.replace("UTC", "GMT") ?? "";
  const match = normalized.match(/^GMT([+-])(\d{2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);

  return sign * (hours * 60 + minutes);
}

export function splitIsoToLocalDateTime(
  value?: string | null,
  timeZone = DEFAULT_EVENT_TIME_ZONE,
): LocalDateTimeParts {
  if (!value) {
    return { date: "", time: "" };
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    const [datePart = "", timePart = ""] = value.split("T");

    return {
      date: datePart,
      time: timePart.slice(0, 5),
    };
  }

  const parts = extractDateTimeParts(
    buildLocalDateTimeFormatter(timeZone).formatToParts(parsedDate),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function localDateTimeToIsoString(
  value: string | undefined,
  timeZone = DEFAULT_EVENT_TIME_ZONE,
) {
  const rawValue = value?.trim() ?? "";

  if (!rawValue) {
    return null;
  }

  const match = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const initialOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  let adjustedUtcMillis = utcGuess - initialOffset * 60_000;
  const resolvedOffset = getTimeZoneOffsetMinutes(new Date(adjustedUtcMillis), timeZone);

  if (resolvedOffset !== initialOffset) {
    adjustedUtcMillis = utcGuess - resolvedOffset * 60_000;
  }

  return new Date(adjustedUtcMillis).toISOString();
}

export function formatDateTimeInTimeZone(
  value: string,
  options?: {
    locale?: string;
    timeZone?: string;
    includeSeconds?: boolean;
    dateStyle?: "full" | "long" | "medium" | "short";
    timeStyle?: "full" | "long" | "medium" | "short";
  },
) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  if (options?.dateStyle || options?.timeStyle) {
    return parsedDate.toLocaleString(options?.locale ?? "ro-RO", {
      timeZone: options?.timeZone ?? DEFAULT_EVENT_TIME_ZONE,
      dateStyle: options?.dateStyle ?? "medium",
      timeStyle: options?.timeStyle ?? "short",
    });
  }

  return parsedDate.toLocaleString(options?.locale ?? "ro-RO", {
    timeZone: options?.timeZone ?? DEFAULT_EVENT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.includeSeconds ? { second: "2-digit" } : {}),
  });
}

export function formatDateInTimeZone(
  value: string,
  options?: {
    locale?: string;
    timeZone?: string;
    dateStyle?: "full" | "long" | "medium" | "short";
  },
) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(options?.locale ?? "ro-RO", {
    timeZone: options?.timeZone ?? DEFAULT_EVENT_TIME_ZONE,
    dateStyle: options?.dateStyle ?? "medium",
  });
}
