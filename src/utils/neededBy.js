export const DEFAULT_EXPIRY_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Turns the optional "needed by" form value (a datetime-local string or '') into what we store.
 * Empty -> no deadline and the default 48 hour expiry (left to the database default).
 * A future deadline sooner than 48 hours also becomes the expiry, so the request does not stay
 * visible after the blood is no longer needed. Past or invalid values return `{ error }`.
 */
export function resolveNeededBy(value, now = new Date()) {
  if (!value) return { neededBy: null, expiresAt: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: 'Enter a valid date and time.' };
  if (date.getTime() <= now.getTime()) return { error: 'Needed by must be in the future.' };
  const defaultExpiry = now.getTime() + DEFAULT_EXPIRY_HOURS * HOUR_MS;
  return {
    neededBy: date.toISOString(),
    expiresAt: date.getTime() < defaultExpiry ? date.toISOString() : null,
  };
}
