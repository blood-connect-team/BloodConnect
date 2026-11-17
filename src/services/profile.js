import { supabase } from '../lib/supabase';
import { unwrap } from './errors';

export async function getMyProfile(userId) {
  return unwrap(
    await supabase.from('profiles').select('id, full_name, phone, role').eq('id', userId).maybeSingle(),
    'Could not load your profile.',
  );
}

export async function getMyDonor(userId) {
  return unwrap(
    await supabase
      .from('donors')
      .select('profile_id, blood_group, city_id, area, available, available_from, cities(name)')
      .eq('profile_id', userId)
      .maybeSingle(),
    'Could not load your donor details.',
  );
}

/**
 * Creates or updates the caller's profile (name + E.164 phone). Role is never sent.
 * Insert and update are separate calls: the database only grants UPDATE on full_name/phone,
 * so an upsert (which would also "update" id) is rejected by design.
 */
export async function saveProfile(userId, { fullName, phone }, exists) {
  const values = { full_name: fullName.trim(), phone };
  const query = exists
    ? supabase.from('profiles').update(values).eq('id', userId)
    : supabase.from('profiles').insert({ id: userId, ...values });
  return unwrap(await query.select('id, full_name, phone, role').single(), 'Could not save your profile.');
}

export async function saveDonor(userId, { bloodGroup, cityId, area, available }) {
  return unwrap(
    await supabase
      .from('donors')
      .upsert(
        { profile_id: userId, blood_group: bloodGroup, city_id: Number(cityId), area: area?.trim() || null, available },
        { onConflict: 'profile_id' },
      )
      .select('profile_id, blood_group, city_id, area, available')
      .single(),
    'Could not save your donor details.',
  );
}

export async function setAvailability(userId, available) {
  return unwrap(
    await supabase.from('donors').update({ available }).eq('profile_id', userId).select('available').single(),
    'Could not update your availability.',
  );
}
