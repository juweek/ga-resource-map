/**
 * Turns a resource's weekly hours into a live status for badges:
 *
 *   'open'    — open right now
 *   'closed'  — has hours on file, and is closed right now
 *   'unknown' — no hours on file (or times we can't read)
 *
 * The badge and the expanded hours list both derive from the same
 * `hours` array, so they can never disagree.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "9:00-17:00", "9am – 1 pm", "09:00-12:00, 14:00-17:00" → [[540,1020], …]
// (minutes since midnight). Returns [] when the text isn't parseable.
function parseRanges(text) {
  if (!text || /closed/i.test(text)) return [];
  const times = [];
  for (const m of text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)) {
    let h = Number(m[1]);
    const mins = Number(m[2] || 0);
    const ap = m[3]?.toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h < 24 && mins < 60) times.push(h * 60 + mins);
  }
  const ranges = [];
  for (let i = 0; i + 1 < times.length; i += 2) {
    if (times[i] < times[i + 1]) ranges.push([times[i], times[i + 1]]);
  }
  return ranges;
}

/** @param hours [{ day: 'Monday', hours: '09:00-12:00' }, …] from feedAmerica.js */
export function openStatus(hours, now = new Date()) {
  if (!hours || hours.length === 0) return 'unknown';
  const today = hours.find((h) => h.day === DAYS[now.getDay()]);
  if (!today) return 'closed';
  const ranges = parseRanges(today.hours);
  if (ranges.length === 0) return 'unknown'; // listed today, times unreadable
  const mins = now.getHours() * 60 + now.getMinutes();
  return ranges.some(([open, close]) => mins >= open && mins < close)
    ? 'open'
    : 'closed';
}
