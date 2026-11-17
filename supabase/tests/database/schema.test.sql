-- pgTAP tests for the initial schema (#16). Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

-- Tables exist
select has_table('public', 'cities', 'cities table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'donors', 'donors table exists');
select has_table('public', 'blood_requests', 'blood_requests table exists');
select has_table('public', 'request_responses', 'request_responses table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'reports', 'reports table exists');

-- Security: RLS must be enabled on EVERY table in the public schema
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'RLS is enabled on every public table'
);

-- Security: without policies (#17) the browser roles see no personal data
set local role anon;
select is_empty($$ select * from public.donors $$, 'anon cannot read donors');
select is_empty($$ select * from public.profiles $$, 'anon cannot read profiles');
select is_empty($$ select * from public.blood_requests $$, 'anon cannot read blood requests');
reset role;

-- Reference data: the city list is public and seeded
set local role anon;
select ok((select count(*) from public.cities) >= 10, 'anon can read the seeded city list');
reset role;

-- Constraints
select throws_ok(
  $$ insert into public.cities (name, province) values ('karachi', 'Sindh') $$,
  '23505', null, 'city names are unique, ignoring case'
);
select col_has_check('public', 'blood_requests', 'units_needed', 'units_needed is range-checked');
select throws_ok(
  $$ select '03001234567'::public.phone_e164 $$,
  '23514', null, 'phone numbers must be E.164'
);

select * from finish();
rollback;
