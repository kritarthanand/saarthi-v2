import { useMemo } from 'react';

import { useProfile } from './useProfile';
import {
  dayKey,
  formatTime,
  formatToday,
  todayKey,
  yesterdayKey,
} from '@/lib/time';

/**
 * Date and time formatting bound to the user's profile timezone.
 *
 * Components should reach for this rather than `toLocaleTimeString` or
 * `Date#getHours`, both of which read the *device's* zone and so drift from the
 * server's idea of which ritual day something belongs to. See src/lib/time.ts.
 */
export function useClock() {
  const { profile } = useProfile();
  const timeZone = profile.timezone;
  const dayStartHour = profile.day_start_hour;

  return useMemo(
    () => ({
      timeZone,
      dayStartHour,
      /** "9:19 AM" */
      time: (input: string | number | Date) => formatTime(input, timeZone),
      /** The YYYY-MM-DD ritual day an instant belongs to. */
      day: (input: string | number | Date) => dayKey(input, timeZone, dayStartHour),
      today: () => todayKey(timeZone, dayStartHour),
      yesterday: () => yesterdayKey(timeZone, dayStartHour),
      /** Today's calendar date, e.g. "Thu, Aug 27". */
      todayLabel: () => formatToday(timeZone),
    }),
    [timeZone, dayStartHour],
  );
}
