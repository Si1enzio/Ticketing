import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const AUTO_CLOSE_AFTER_START_MINUTES = 60;
const AUTO_ARCHIVE_AFTER_START_HOURS = 5;
const LIFECYCLE_SYNC_THROTTLE_MS = 30_000;

let lastLifecycleSyncAt = 0;

function addMinutes(value: string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function addHours(value: string, hours: number) {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function getEffectiveAutoCloseAt(startsAt: string, reservationClosesAt: string | null) {
  const autoCloseAt = addMinutes(startsAt, AUTO_CLOSE_AFTER_START_MINUTES);

  if (!reservationClosesAt) {
    return autoCloseAt;
  }

  return new Date(reservationClosesAt) < new Date(autoCloseAt)
    ? reservationClosesAt
    : autoCloseAt;
}

export async function syncMatchLifecycleStatuses(options?: { force?: boolean }) {
  const now = Date.now();

  if (!options?.force && now - lastLifecycleSyncAt < LIFECYCLE_SYNC_THROTTLE_MS) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  lastLifecycleSyncAt = now;

  const { data: rows, error } = await supabase
    .from("matches")
    .select(
      `
        id,
        status,
        starts_at,
        archived_at,
        match_settings (
          closes_at
        )
      `,
    )
    .in("status", ["published", "closed", "completed"]);

  if (error) {
    console.error("Nu am putut sincroniza ciclul de viata al evenimentelor.", error);
    return;
  }

  const nowIso = new Date(now).toISOString();

  for (const row of (rows ?? []) as Array<{
    id: string;
    status: string;
    starts_at: string;
    archived_at?: string | null;
    match_settings?: { closes_at?: string | null } | Array<{ closes_at?: string | null }> | null;
  }>) {
    const settingsRow = Array.isArray(row.match_settings)
      ? row.match_settings[0] ?? null
      : row.match_settings ?? null;

    const effectiveAutoCloseAt = getEffectiveAutoCloseAt(
      row.starts_at,
      settingsRow?.closes_at ?? null,
    );
    const archiveAt = addHours(row.starts_at, AUTO_ARCHIVE_AFTER_START_HOURS);

    if (new Date(nowIso) >= new Date(archiveAt) && row.status !== "archived") {
      const { error: archiveError } = await supabase
        .from("matches")
        .update({
          status: "archived",
          archived_at: row.archived_at ?? nowIso,
        })
        .eq("id", row.id)
        .neq("status", "archived");

      if (archiveError) {
        console.error("Nu am putut arhiva automat evenimentul.", archiveError);
      }

      const { error: closeSettingsError } = await supabase.from("match_settings").upsert(
        {
          match_id: row.id,
          closes_at: effectiveAutoCloseAt,
        },
        {
          onConflict: "match_id",
        },
      );

      if (closeSettingsError) {
        console.error(
          "Nu am putut inchide setarile ticketing-ului in timpul arhivarii automate.",
          closeSettingsError,
        );
      }

      continue;
    }

    if (
      new Date(nowIso) >= new Date(effectiveAutoCloseAt) &&
      row.status === "published"
    ) {
      const { error: closeError } = await supabase
        .from("matches")
        .update({
          status: "closed",
        })
        .eq("id", row.id)
        .eq("status", "published");

      if (closeError) {
        console.error("Nu am putut inchide automat evenimentul.", closeError);
      }
    }

    if (
      !settingsRow?.closes_at ||
      new Date(settingsRow.closes_at) > new Date(effectiveAutoCloseAt)
    ) {
      const { error: settingsError } = await supabase.from("match_settings").upsert(
        {
          match_id: row.id,
          closes_at: effectiveAutoCloseAt,
        },
        {
          onConflict: "match_id",
        },
      );

      if (settingsError) {
        console.error(
          "Nu am putut actualiza inchiderea automata a ticketing-ului.",
          settingsError,
        );
      }
    }
  }
}

export function getMatchAutoArchiveAt(startsAt: string) {
  return addHours(startsAt, AUTO_ARCHIVE_AFTER_START_HOURS);
}

export function getMatchAutoCloseAt(startsAt: string, reservationClosesAt: string | null) {
  return getEffectiveAutoCloseAt(startsAt, reservationClosesAt);
}
