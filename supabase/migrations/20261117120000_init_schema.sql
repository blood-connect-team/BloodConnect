-- Blood Connect: initial schema (#16).
-- Decision: docs/adr/0001-backend-platform.md
--
-- Row Level Security is ENABLED on every table and, apart from the public city list,
-- NO access policies are defined here. Everything is therefore denied to the browser
-- (anon/authenticated) until #17 adds explicit, minimal policies and privacy-preserving
-- functions. Never weaken this by disabling RLS.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.blood_group as enum ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
create type public.urgency_level as enum ('critical', 'high', 'medium');
create type public.request_status as enum ('active', 'fulfilled', 'cancelled', 'expired');
create type public.response_status as enum ('accepted', 'withdrawn', 'donated');
create type public.user_role as enum ('user', 'admin');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- E.164 phone numbers, e.g. +923001234567 (normalisation happens in the app, #2).
create domain public.phone_e164 as text
  check (value ~ '^\+[1-9][0-9]{7,14}$');

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table public.cities (
  id          smallint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 60),
  province    text not null check (char_length(province) between 2 and 60),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index cities_name_unique on public.cities (lower(name));
comment on table public.cities is 'Supported cities. Matching uses city_id, never free text (#22).';

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 100),
  phone       public.phone_e164,
  role        public.user_role not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- One donor profile per phone number (deters duplicate registrations, #3).
create unique index profiles_phone_unique on public.profiles (phone) where phone is not null;
comment on column public.profiles.role is 'Only changeable by admins (enforced by policies in #17/#19).';

create table public.donors (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  blood_group         public.blood_group not null,
  city_id             smallint not null references public.cities (id),
  area                text check (char_length(area) <= 100),
  available           boolean not null default true,
  available_from      date,
  last_donation_date  date check (last_donation_date <= current_date),
  notify_email        boolean not null default true,
  notify_whatsapp     boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on column public.donors.last_donation_date is 'Self-reported and informational only. The app never decides eligibility.';
create index donors_matching_idx on public.donors (city_id, blood_group) where available;

-- ---------------------------------------------------------------------------
-- Requests and responses
-- ---------------------------------------------------------------------------
create table public.blood_requests (
  id                 uuid primary key default gen_random_uuid(),
  requester_id       uuid not null references public.profiles (id) on delete cascade,
  blood_group        public.blood_group not null,
  units_needed       smallint not null default 1 check (units_needed between 1 and 10),
  city_id            smallint not null references public.cities (id),
  hospital_name      text not null check (char_length(hospital_name) between 2 and 120),
  urgency            public.urgency_level not null default 'high',
  contact_phone      public.phone_e164 not null,
  notes              text check (char_length(notes) <= 500),
  patient_reference  text check (char_length(patient_reference) <= 60),
  status             public.request_status not null default 'active',
  needed_by          timestamptz,
  expires_at         timestamptz not null default (now() + interval '48 hours'),
  idempotency_key    uuid unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint blood_requests_expiry_after_creation check (expires_at > created_at)
);
comment on column public.blood_requests.patient_reference is 'Optional, visible to the requester only. Never a full patient identity.';
comment on column public.blood_requests.idempotency_key is 'Prevents duplicate submissions from retries or double clicks (#29).';
create index blood_requests_open_idx on public.blood_requests (status, city_id, blood_group);
create index blood_requests_requester_idx on public.blood_requests (requester_id);

create table public.request_responses (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.blood_requests (id) on delete cascade,
  donor_id    uuid not null references public.donors (profile_id) on delete cascade,
  status      public.response_status not null default 'accepted',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint request_responses_once_per_donor unique (request_id, donor_id)
);
create index request_responses_donor_idx on public.request_responses (donor_id);

-- ---------------------------------------------------------------------------
-- Notifications and trust & safety
-- ---------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  request_id    uuid references public.blood_requests (id) on delete set null,
  channel       text not null check (channel in ('email', 'in_app')),
  kind          text not null check (char_length(kind) between 2 and 50),
  status        text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'read')),
  error         text check (char_length(error) <= 500),
  created_at    timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.blood_requests (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text not null check (reason in ('fake_request', 'asked_for_money', 'abusive', 'duplicate', 'other')),
  details      text check (char_length(details) <= 500),
  status       text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at   timestamptz not null default now(),
  constraint reports_once_per_reporter unique (request_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger donors_set_updated_at before update on public.donors
  for each row execute function public.set_updated_at();
create trigger blood_requests_set_updated_at before update on public.blood_requests
  for each row execute function public.set_updated_at();
create trigger request_responses_set_updated_at before update on public.request_responses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled everywhere; policies come in #17
-- ---------------------------------------------------------------------------
alter table public.cities            enable row level security;
alter table public.profiles          enable row level security;
alter table public.donors            enable row level security;
alter table public.blood_requests    enable row level security;
alter table public.request_responses enable row level security;
alter table public.notifications     enable row level security;
alter table public.reports           enable row level security;

-- Table privileges: the hosted project does NOT auto-expose new tables to the Data API,
-- so every grant is explicit. Only the public city list is granted here; #17 adds the
-- grants for the other tables together with their policies.
revoke all on public.cities, public.profiles, public.donors, public.blood_requests,
  public.request_responses, public.notifications, public.reports from anon, authenticated;
grant select on public.cities to anon, authenticated;

-- The only policy in this migration: the city list is public reference data.
create policy "Cities are readable by everyone"
  on public.cities for select
  to anon, authenticated
  using (is_active);
