import { supabase } from '../lib/supabase';
import { unwrap } from './errors';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const URGENCY_LEVELS = [
  { id: 'critical', label: 'Critical', hint: 'Needed within hours' },
  { id: 'high', label: 'High', hint: 'Needed today' },
  { id: 'medium', label: 'Medium', hint: 'Needed in 1–2 days' },
];

export async function listCities() {
  return unwrap(await supabase.from('cities').select('id, name, province').order('name'), 'Could not load cities.');
}

/** Requests that match the logged-in donor (privacy-preserving database function). */
export async function getMatchingRequests() {
  return unwrap(await supabase.rpc('get_active_requests_for_me'), 'Could not load requests.');
}

export async function getMyRequests(userId) {
  return unwrap(
    await supabase
      .from('blood_requests')
      .select('id, blood_group, units_needed, hospital_name, urgency, status, needed_by, expires_at, created_at, cities(name)')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false }),
    'Could not load your requests.',
  );
}

export async function createRequest(userId, form, idempotencyKey) {
  return unwrap(
    await supabase
      .from('blood_requests')
      .insert({
        requester_id: userId,
        hospital_name: form.hospital.trim(),
        patient_reference: form.patientReference?.trim() || null,
        blood_group: form.bloodGroup,
        urgency: form.urgency,
        city_id: Number(form.cityId),
        units_needed: Number(form.units),
        needed_by: form.neededBy ?? null,
        // Only set when the deadline is earlier than the 48 hour default (see utils/neededBy.js).
        ...(form.expiresAt ? { expires_at: form.expiresAt } : {}),
        contact_phone: form.contactPhone,
        notes: form.notes?.trim() || null,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single(),
    'Could not create the request.',
  );
}

export async function countMatchingDonors(requestId) {
  return unwrap(await supabase.rpc('count_matching_donors', { p_request_id: requestId }), 'Could not count matching donors.');
}

export async function cancelRequest(requestId) {
  return unwrap(
    await supabase.from('blood_requests').update({ status: 'cancelled' }).eq('id', requestId).select('id, status').single(),
    'Could not cancel the request.',
  );
}

/**
 * Donor accepts or withdraws from a request. The first answer inserts a row; later changes
 * update its status (one row per donor per request).
 */
export async function setMyResponse(userId, requestId, status, hasRow) {
  const query = hasRow
    ? supabase.from('request_responses').update({ status }).eq('request_id', requestId).eq('donor_id', userId)
    : supabase.from('request_responses').insert({ request_id: requestId, donor_id: userId, status });
  return unwrap(await query.select('id, status').single(), 'Could not save your response.');
}

/** Contact details the database lets the caller see for this request (see get_request_contacts). */
export async function getRequestContacts(requestId) {
  return unwrap(await supabase.rpc('get_request_contacts', { p_request_id: requestId }), 'Could not load contact details.');
}
