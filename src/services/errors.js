// Turns Supabase/PostgREST errors into short, user-facing messages (never raw SQL details).
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const code = error.code || error.status;
  const msg = String(error.message || '');
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) return 'Network problem. Check your connection and try again.';
  if (code === '23505') return 'This already exists (for example, the phone number is used by another account).';
  if (code === '42501' || /row-level security/i.test(msg)) return 'You are not allowed to do that.';
  if (code === '23514' || code === '22P02') return 'Some of the information is not valid. Please check the form.';
  if (/rate limit|too many/i.test(msg) || code === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (/expired|invalid.*(otp|token)|otp.*(expired|invalid)/i.test(msg)) return 'That code is wrong or has expired. Request a new one.';
  return msg && msg.length < 160 ? msg : fallback;
}

/** Throws a readable Error when a Supabase call returned { error }. */
export function unwrap({ data, error }, fallback) {
  if (error) {
    const e = new Error(friendlyError(error, fallback));
    e.cause = error;
    throw e;
  }
  return data;
}
