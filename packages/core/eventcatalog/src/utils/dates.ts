// How EventCatalog shows dates, e.g. when something was last updated

/** A date as "10 Nov 2026", in UTC so it's the same day for everyone (and on the server that rendered it) */
export const formatShortDate = (date: Date | string | number) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const relativeTime = () => new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * In the browser: writes every `<time data-relative-time>` on the page as "3 days ago", with the full date on hover.
 * Counted there, so a prerendered page stays current.
 */
export const showRelativeTimes = () => {
  const format = relativeTime();
  document.querySelectorAll<HTMLTimeElement>('time[data-relative-time]').forEach((time) => {
    const date = new Date(time.dateTime);
    const seconds = (date.getTime() - Date.now()) / 1000;
    const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) ?? ['minute', 60];
    time.textContent = format.format(Math.round(seconds / size), unit);
    time.title = date.toLocaleString();
  });
};
