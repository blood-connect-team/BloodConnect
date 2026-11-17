-- pgTAP tests for access rules (#17). Run with: npx supabase test db
-- Synthetic users only:
--  A = requester, B = matching donor (same city/group), C = donor in another city, D = admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- ---------- fixtures (as the table owner, RLS does not apply) ----------
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-a000-00000000000a', 'requester@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000b', 'donor.b@example.com',   'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000c', 'donor.c@example.com',   'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000d', 'admin@example.com',     'authenticated', 'authenticated');

insert into public.profiles (id, full_name, phone, role) values
  ('00000000-0000-4000-a000-00000000000a', 'Test Requester', '+923000000001', 'user'),
  ('00000000-0000-4000-a000-00000000000b', 'Test Donor B',   '+923000000002', 'user'),
  ('00000000-0000-4000-a000-00000000000c', 'Test Donor C',   '+923000000003', 'user'),
  ('00000000-0000-4000-a000-00000000000d', 'Test Admin',     null,            'admin');

insert into public.donors (profile_id, blood_group, city_id) values
  ('00000000-0000-4000-a000-00000000000b', 'O+', (select id from public.cities where name = 'Karachi')),
  ('00000000-0000-4000-a000-00000000000c', 'O+', (select id from public.cities where name = 'Lahore'));

insert into public.blood_requests (id, requester_id, blood_group, city_id, hospital_name, urgency, contact_phone, patient_reference)
values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-00000000000a', 'O+',
        (select id from public.cities where name = 'Karachi'), 'Test Hospital', 'critical', '+923000000001', 'Bed 12');

-- ---------- anon (not logged in) ----------
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.get_active_requests_for_me() $$, '42501', null, 'anon cannot call the matching function');
reset role;

-- ---------- B: matching donor ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.profiles), 1, 'B sees only their own profile');
select is_empty($$ select * from public.blood_requests $$, 'B cannot read requests from the table directly');
select is((select count(*)::int from public.get_active_requests_for_me()), 1, 'B sees the matching request through the function');
select is_empty($$ select * from public.get_request_contacts('00000000-0000-4000-b000-000000000001') $$,
  'B gets no contact details before accepting');
select throws_ok($$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-00000000000b' $$,
  '42501', null, 'B cannot make themselves admin');
select throws_ok($$ insert into public.blood_requests (requester_id, blood_group, city_id, hospital_name, contact_phone)
                   values ('00000000-0000-4000-a000-00000000000a', 'O+', 1, 'Fake', '+923000000009') $$,
  '42501', null, 'B cannot create a request in someone else''s name');
select lives_ok($$ insert into public.request_responses (request_id, donor_id)
                  values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-00000000000b') $$,
  'B can accept the matching request');
select is((select count(*)::int from public.get_request_contacts('00000000-0000-4000-b000-000000000001') where party = 'requester'), 1,
  'after accepting, B sees the requester''s contact');
reset role;

-- ---------- C: donor in another city ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.get_active_requests_for_me()), 0, 'C (other city) is not shown the request');
select is_empty($$ select * from public.get_request_contacts('00000000-0000-4000-b000-000000000001') $$,
  'C gets no contact details');
select throws_ok($$ insert into public.request_responses (request_id, donor_id)
                   values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-00000000000b') $$,
  '42501', null, 'C cannot respond in B''s name');
select is_empty($$ select * from public.request_responses $$, 'C cannot read other people''s responses');
reset role;

-- ---------- A: requester ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.blood_requests), 1, 'A sees their own request');
select is((select phone from public.get_request_contacts('00000000-0000-4000-b000-000000000001') where party = 'donor'), '+923000000002',
  'A sees the phone of the donor who accepted');
select is(public.count_matching_donors('00000000-0000-4000-b000-000000000001'), 1, 'A gets a count of matching donors (no identities)');
select is_empty($$ select * from public.donors $$, 'A cannot browse donors');
reset role;

-- ---------- D: admin ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.profiles), 4, 'admin can read all profiles');
select ok(public.is_admin(), 'is_admin() is true for the admin');
reset role;

select * from finish();
rollback;
