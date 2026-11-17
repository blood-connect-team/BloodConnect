-- Row Level Security policies and privacy-preserving functions (#17).
--
-- Principles (blueprint §10.2):
--  * Nobody browses donors. Donors see requests only through get_active_requests_for_me(),
--    which returns no patient identity and no requester phone.
--  * Contact details are revealed only between a requester and donors who ACCEPTED that request
--    (get_request_contacts()).
--  * Users can read/change only their own rows; admins (profiles.role = 'admin') can read everything.
--  * Nobody can change their own role (column-level grants; role changes are admin-only, #19).
-- Functions that bypass RLS are SECURITY DEFINER with an empty search_path and explicit auth.uid() checks.

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;  -- never "role"

create policy "Profiles: read own, admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Profiles: create own, as a normal user"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and role = 'user');

create policy "Profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Profiles: delete own, admins delete any"
  on public.profiles for delete to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- donors
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.donors to authenticated;

create policy "Donors: read own, admins read all"
  on public.donors for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy "Donors: create own"
  on public.donors for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy "Donors: update own"
  on public.donors for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "Donors: delete own"
  on public.donors for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- blood_requests
-- ---------------------------------------------------------------------------
grant select, insert on public.blood_requests to authenticated;
grant update (status, units_needed, needed_by, notes, contact_phone) on public.blood_requests to authenticated;
grant delete on public.blood_requests to authenticated;

create policy "Requests: read own, admins read all"
  on public.blood_requests for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_admin()));

create policy "Requests: create own, active"
  on public.blood_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'active');

create policy "Requests: owner updates own (no reactivation)"
  on public.blood_requests for update to authenticated
  using (requester_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()) and status in ('active', 'cancelled', 'fulfilled'));

create policy "Requests: admins delete"
  on public.blood_requests for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- request_responses
-- ---------------------------------------------------------------------------
grant select, insert on public.request_responses to authenticated;
grant update (status) on public.request_responses to authenticated;

create policy "Responses: donor, the request's owner, or admins can read"
  on public.request_responses for select to authenticated
  using (
    donor_id = (select auth.uid())
    or exists (select 1 from public.blood_requests r
               where r.id = request_id and r.requester_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- Donors cannot read blood_requests rows (RLS), so the "is this request open for me?" check
-- runs in a SECURITY DEFINER helper that returns only true/false.
create or replace function public.can_respond_to_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blood_requests r
    join public.donors d on d.profile_id = (select auth.uid())
    where r.id = p_request_id
      and r.status = 'active'
      and r.expires_at > now()
      and r.requester_id <> d.profile_id
  );
$$;
revoke all on function public.can_respond_to_request(uuid) from public, anon;
grant execute on function public.can_respond_to_request(uuid) to authenticated;

create policy "Responses: a donor responds to an open request (not their own)"
  on public.request_responses for insert to authenticated
  with check (
    donor_id = (select auth.uid())
    and status = 'accepted'
    and (select public.can_respond_to_request(request_id))
  );

create policy "Responses: donor updates own"
  on public.request_responses for update to authenticated
  using (donor_id = (select auth.uid()))
  with check (donor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- notifications (written only by the server-side sender, #31)
-- ---------------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (status) on public.notifications to authenticated;

create policy "Notifications: recipient reads own"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Notifications: recipient marks own as read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()) and status = 'read');

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
grant select, insert on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

create policy "Reports: reporter reads own, admins read all"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

create policy "Reports: create own"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

create policy "Reports: admins update status"
  on public.reports for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privacy-preserving functions
-- ---------------------------------------------------------------------------

-- Active, unexpired requests that match the calling donor (same blood group and city, exact
-- match until the reviewed compatibility table lands in #24). Excludes the donor's own requests,
-- unavailable or paused donors, and returns no patient identity or phone.
create or replace function public.get_active_requests_for_me()
returns table (
  id uuid,
  blood_group public.blood_group,
  units_needed smallint,
  city text,
  hospital_name text,
  urgency public.urgency_level,
  needed_by timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  my_response public.response_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.blood_group, r.units_needed, c.name, r.hospital_name, r.urgency,
         r.needed_by, r.expires_at, r.created_at, resp.status
  from public.donors d
  join public.blood_requests r
    on r.blood_group = d.blood_group and r.city_id = d.city_id
  join public.cities c on c.id = r.city_id
  left join public.request_responses resp
    on resp.request_id = r.id and resp.donor_id = d.profile_id
  where d.profile_id = (select auth.uid())
    and d.available
    and (d.available_from is null or d.available_from <= current_date)
    and r.status = 'active'
    and r.expires_at > now()
    and r.requester_id <> d.profile_id
  order by case r.urgency when 'critical' then 0 when 'high' then 1 else 2 end, r.created_at desc;
$$;
revoke all on function public.get_active_requests_for_me() from public, anon;
grant execute on function public.get_active_requests_for_me() to authenticated;

-- Contact details for one request, only between its owner and donors who accepted it.
--  * Called by the request owner: the accepted donors (name + phone).
--  * Called by a donor who accepted: the requester's contact phone and the hospital.
--  * Anyone else: nothing.
create or replace function public.get_request_contacts(p_request_id uuid)
returns table (party text, full_name text, phone text, hospital_name text)
language sql
stable
security definer
set search_path = ''
as $$
  -- owner sees accepted donors
  select 'donor'::text, p.full_name, p.phone::text, null::text
  from public.blood_requests r
  join public.request_responses resp on resp.request_id = r.id and resp.status in ('accepted', 'donated')
  join public.profiles p on p.id = resp.donor_id
  where r.id = p_request_id and r.requester_id = (select auth.uid())
  union all
  -- an accepted donor sees the requester's contact
  select 'requester'::text, p.full_name, r.contact_phone::text, r.hospital_name
  from public.blood_requests r
  join public.request_responses resp on resp.request_id = r.id
       and resp.donor_id = (select auth.uid()) and resp.status in ('accepted', 'donated')
  join public.profiles p on p.id = r.requester_id
  where r.id = p_request_id;
$$;
revoke all on function public.get_request_contacts(uuid) from public, anon;
grant execute on function public.get_request_contacts(uuid) to authenticated;

-- How many available donors match one of MY requests (a count only, never identities).
create or replace function public.count_matching_donors(p_request_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.blood_requests r
  join public.donors d on d.blood_group = r.blood_group and d.city_id = r.city_id
  where r.id = p_request_id
    and r.requester_id = (select auth.uid())
    and d.available
    and (d.available_from is null or d.available_from <= current_date)
    and d.profile_id <> r.requester_id;
$$;
revoke all on function public.count_matching_donors(uuid) from public, anon;
grant execute on function public.count_matching_donors(uuid) to authenticated;
