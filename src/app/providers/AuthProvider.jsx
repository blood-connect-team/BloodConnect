import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getMyDonor, getMyProfile } from '../../services/profile';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      setDonor(null);
      return;
    }
    try {
      const [p, d] = await Promise.all([getMyProfile(user.id), getMyDonor(user.id)]);
      setProfile(p);
      setDonor(d);
      setProfileError(null);
    } catch (error) {
      setProfileError(error.message);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user ?? null);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Defer the database call so it does not run inside the auth callback.
      setTimeout(() => {
        loadProfile(next?.user ?? null).finally(() => setLoading(false));
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session?.user ?? null), [loadProfile, session]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      donor,
      loading,
      profileError,
      isAdmin: profile?.role === 'admin',
      refreshProfile,
    }),
    [session, profile, donor, loading, profileError, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
