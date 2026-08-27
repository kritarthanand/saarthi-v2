/**
 * Every user-facing date and time is rendered in the *profile's* timezone, never
 * the device's.
 *
 * The server decides which ritual day a thread belongs to from the profile
 * timezone (see `_daily_period_key`). A client that formats in device-local time
 * therefore disagrees with the backend the moment the two differ — travel, a
 * simulator in another zone, a phone that never left home. Observed: a thread
 * created 20:49 in America/Los_Angeles rendered as "9:19 AM" and grouped under
 * *Today* on an IST device, while the server had it filed under the previous
 * ritual day and left it off the Today tab entirely.
 *
 * `dayStartHour` is a separate correction and composes with this one: a day runs
 * from that hour to the same hour next day, in the profile's zone.
 */

const DEFAULT_TIME_ZONE = 'America/Los_Angeles';

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
};

// Intl.DateTimeFormat construction is comparatively expensive and these are
// called per message row, so keep one per zone.
const formatters = new Map<string, Intl.DateTimeFormat>();

let warned = false;

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;

  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  let made: Intl.DateTimeFormat;
  try {
    made = new Intl.DateTimeFormat('en-US', options);
  } catch {
    // A runtime without full ICU cannot resolve named zones. Fall back to device
    // local so the app still renders, but say so — silently reverting would
    // reintroduce exactly the mismatch this module exists to prevent.
    if (!warned) {
      warned = true;
      console.warn(
        `[time] timezone "${timeZone}" is unsupported by this runtime; ` +
          'falling back to device-local time. Dates may disagree with the server.',
      );
    }
    made = new Intl.DateTimeFormat('en-US', { ...options, timeZone: undefined });
  }

  formatters.set(timeZone, made);
  return made;
}

export function zonedParts(
  input: string | number | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): ZonedParts {
  const date = input instanceof Date ? input : new Date(input);
  const out: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return {
    year: out.year ?? 1970,
    month: out.month ?? 1,
    day: out.day ?? 1,
    // Some engines render midnight as hour 24 under hour12: false.
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "9:19 AM" in the profile's zone. */
export function formatTime(
  input: string | number | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const { hour, minute } = zonedParts(input, timeZone);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${pad(minute)} ${suffix}`;
}

/**
 * The YYYY-MM-DD ritual day an instant belongs to — the client-side twin of the
 * server's `_daily_period_key`. Anything before `dayStartHour` belongs to the
 * previous day.
 */
export function dayKey(
  input: string | number | Date,
  timeZone: string = DEFAULT_TIME_ZONE,
  dayStartHour = 4,
): string {
  const { year, month, day, hour } = zonedParts(input, timeZone);
  if (hour >= dayStartHour) return `${year}-${pad(month)}-${pad(day)}`;

  // Step back a calendar day. Done in UTC purely as date arithmetic on the
  // already-zoned components, so no DST shift can leak in.
  const stepped = new Date(Date.UTC(year, month - 1, day));
  stepped.setUTCDate(stepped.getUTCDate() - 1);
  return `${stepped.getUTCFullYear()}-${pad(stepped.getUTCMonth() + 1)}-${pad(stepped.getUTCDate())}`;
}

export function todayKey(timeZone?: string, dayStartHour = 4): string {
  return dayKey(Date.now(), timeZone, dayStartHour);
}

export function yesterdayKey(timeZone?: string, dayStartHour = 4): string {
  return dayKey(Date.now() - 86_400_000, timeZone, dayStartHour);
}

/**
 * "Thu, Aug 27" for a YYYY-MM-DD key. The key is already a calendar day, so this
 * formats in UTC — running it through a zone would shift the label by a day.
 */
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Today's calendar date in the profile's zone, e.g. "Thu, Aug 27". */
export function formatToday(timeZone: string = DEFAULT_TIME_ZONE): string {
  const { year, month, day } = zonedParts(Date.now(), timeZone);
  return formatDayKey(`${year}-${pad(month)}-${pad(day)}`);
}
