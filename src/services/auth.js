import { supabase } from '../lib/supabase';
import { unwrap } from './errors';

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

/**
 * Sends a sign-in email with a 6-digit code (and a link). Creates the account on first use.
 * The response is the same whether or not the email is registered (no user enumeration).
 */
export async function sendLoginCode(email) {
  return unwrap(
    await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/login` },
    }),
    'Could not send the code.',
  );
}

export async function verifyLoginCode(email, code) {
  return unwrap(
    await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: String(code).trim(), type: 'email' }),
    'Could not verify the code.',
  );
}

export async function signOut() {
  return unwrap(await supabase.auth.signOut(), 'Could not log out.');
}
