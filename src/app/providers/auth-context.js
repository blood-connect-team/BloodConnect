import { createContext, useContext } from 'react';

/**
 * Auth state shared by the whole app:
 * { session, user, profile, donor, loading, refreshProfile }
 * - session/user come from Supabase Auth (never from localStorage values we write ourselves)
 * - profile is null until the user completes registration
 * - donor is null if the user has not registered as a donor
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
