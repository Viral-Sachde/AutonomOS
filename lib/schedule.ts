/**
 * When an approved piece should actually go out.
 *
 * Posting the moment something is approved means posting whenever an
 * operator happened to review the queue, not when the audience is actually
 * looking. Peak windows are fixed in IST (no DST, so a flat UTC offset is
 * exact): lunch 12:00-14:00 and evening 19:00-21:00. Worked out in UTC
 * minutes-of-day throughout rather than constructing IST Date objects, since
 * that needs no offset arithmetic to get wrong twice.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;

/** Peak windows, expressed as UTC minutes-of-day (IST window minus the offset). */
const PEAK_WINDOWS_UTC_MIN = [
  { start: 12 * 60 - IST_OFFSET_MIN, end: 14 * 60 - IST_OFFSET_MIN }, // 12:00-14:00 IST
  { start: 19 * 60 - IST_OFFSET_MIN, end: 21 * 60 - IST_OFFSET_MIN }, // 19:00-21:00 IST
].map((w) => ({
  // Both windows land after UTC midnight for IST, but the formula is kept
  // general rather than assuming that, so a future window near IST midnight
  // would not silently go negative.
  start: ((w.start % 1440) + 1440) % 1440,
  end: ((w.end % 1440) + 1440) % 1440,
}));

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The next time a piece approved right now should go out: immediately if
 * we're already inside a peak window, otherwise the start of the next one
 * (today's remaining window, or tomorrow's first window once both of
 * today's have passed).
 */
export function nextPeakTime(from: Date = new Date()): Date {
  const startOfDayUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const minutesNow = (from.getTime() - startOfDayUtc) / 60000;

  for (const w of PEAK_WINDOWS_UTC_MIN) {
    if (minutesNow < w.start) return new Date(startOfDayUtc + w.start * 60000);
    if (minutesNow < w.end) return from;
  }

  return new Date(startOfDayUtc + DAY_MS + PEAK_WINDOWS_UTC_MIN[0].start * 60000);
}
