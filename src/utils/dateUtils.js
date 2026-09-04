/**
 * Global App-Wide Date & Time Utility for Agrimitra AI
 * 
 * Safely parses and formats live timestamps from Firestore, APIs, and Date objects.
 * Ensures: Real Day + Real Month + Real Year + Real Time.
 * Prevents 1970 / pre-2020 epoch bugs from uptime counters or missing fields.
 */

/**
 * Safely parse any date input (Firestore Timestamp, {seconds: ...}, ISO string, Unix timestamp)
 * into a valid Date object. Defaults to current real Date if missing, invalid, or 1970 epoch.
 */
export const parseValidDate = (input) => {
  if (!input) return new Date();

  let d = null;

  if (input instanceof Date) {
    d = isNaN(input.getTime()) ? null : input;
  } else if (typeof input?.toDate === 'function') {
    try {
      const res = input.toDate();
      if (res instanceof Date && !isNaN(res.getTime())) d = res;
    } catch (e) {}
  } else {
    const seconds = input?.seconds ?? input?._seconds;
    if (typeof seconds === 'number') {
      d = new Date(seconds * 1000);
    } else if (typeof input === 'number') {
      const millis = input < 1e11 ? input * 1000 : input;
      d = new Date(millis);
    } else if (typeof input === 'string') {
      const res = new Date(input);
      if (!isNaN(res.getTime())) d = res;
    }
  }

  // If date is invalid or 1970 epoch / pre-2020 (due to uptime counters or nulls),
  // return current real-world Date for accurate live display.
  if (!d || isNaN(d.getTime()) || d.getFullYear() < 2020) {
    return new Date();
  }

  return d;
};

/**
 * Format date as "DD Month YYYY" (e.g. "02 Sep 2026")
 */
export const formatAppDate = (dateInput) => {
  const d = parseValidDate(dateInput);
  const day = d.getDate().toString().padStart(2, '0');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format time in 12-hour AM/PM (e.g. "07:45 PM")
 */
export const formatAppTime = (dateInput) => {
  const d = parseValidDate(dateInput);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Format full combined Date + Time (e.g. "02 Sep 2026 • 07:45 PM")
 */
export const formatAppDateTime = (dateInput) => {
  const d = parseValidDate(dateInput);
  const formattedDate = formatAppDate(d);
  const formattedTime = formatAppTime(d);
  return `${formattedDate} • ${formattedTime}`;
};

/**
 * Format relative time string (e.g. "Just now", "5 mins ago", "2h ago", or "02 Sep 2026")
 */
export const formatRelativeTime = (dateInput) => {
  const d = parseValidDate(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec >= 0 && diffSec < 60) return 'Just now';
  if (diffSec >= 60 && diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec >= 3600 && diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

  return formatAppDate(d);
};

export default {
  parseValidDate,
  formatAppDate,
  formatAppTime,
  formatAppDateTime,
  formatRelativeTime
};
