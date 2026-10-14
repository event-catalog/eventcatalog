/**
 * Per-IP rate limiting, in memory (one long-running process on Fly), and the request size cap.
 */
export const MAX_BODY_BYTES = 1024 * 1024;

type Window = { minute: number; minuteCount: number; day: number; dayCount: number };

export function createRateLimiter({ perMinute = 60, perDay = 1000 } = {}) {
  const windows = new Map<string, Window>();

  // Forget idle clients now and then, so the map doesn't grow forever
  setInterval(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    windows.forEach((window, key) => window.day < day && windows.delete(key));
  }, 3_600_000).unref();

  /** Counts a request; returns why it's refused, or undefined when it's allowed */
  return (key: string): string | undefined => {
    const now = Date.now();
    const minute = Math.floor(now / 60_000);
    const day = Math.floor(now / 86_400_000);
    const window = windows.get(key) ?? { minute, minuteCount: 0, day, dayCount: 0 };
    if (window.minute !== minute) Object.assign(window, { minute, minuteCount: 0 });
    if (window.day !== day) Object.assign(window, { day, dayCount: 0 });
    window.minuteCount++;
    window.dayCount++;
    windows.set(key, window);
    if (window.minuteCount > perMinute) return `Rate limit: at most ${perMinute} requests a minute. Try again shortly.`;
    if (window.dayCount > perDay) return `Rate limit: at most ${perDay} requests a day.`;
    return undefined;
  };
}
