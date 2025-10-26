/**
 * Utility functions for SportsDB
 */
/**
 * Format an ISO timestamp into a date and time string in a specific time zone
 *
 * @param {string} isoTimestamp The ISO timestamp, e.g. "2025-10-05T13:30:00Z"
 * @param {string} timeZone The IANA time zone name, e.g. "America/Los_Angeles"
 *
 * @returns An object with 'date' and 'time' properties
 */
export const formatEventDateTime = (isoTimestamp, timeZone = 'America/Los_Angeles') => {
  if (!isoTimestamp) return { date: '', time: '' };
  // If timestamp has no offset or Z, assume UTC
  const hasOffset = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(isoTimestamp);
  const iso = hasOffset ? isoTimestamp : `${isoTimestamp}Z`;
  const instant = new Date(iso);

  const dateStr = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone
  }).format(instant).replace(',', ''); // "Oct 05 2025"

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone
  }).format(instant); // "06:30 PM"

  return { date: dateStr, time: timeStr };
};
