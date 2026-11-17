# ADR 0001 — Backend platform: migrate from Appwrite to Supabase

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-17 |
| **Deciders** | Release owners (Arham, Ammar), on behalf of the team |
| **Issue** | #1 |

## Context

- The hackathon app talks to **Appwrite Cloud** directly from the browser. The Appwrite project is **paused for inactivity** (every API call returns HTTP 403 `project_paused`), so registration, login and requests do not work.
- The current data model has no real security:
  - Login is email-only, and the session is a `localStorage` value.
  - Donor and request documents are created with public read permissions.
  - The browser fetches donor contact details itself in order to send emails.
- The product handles personal data about donors and patients. It needs **real authentication** and **database-enforced access rules**, so that a donor's phone number is only revealed to a requester whose request the donor accepted.
- The team's preferred platform is **Supabase**, and everything must stay **free**.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Restore Appwrite** and harden it | No migration; existing SDK code | Project ownership with one person; schema lives only in the console; the security model would still need a redesign; the team has no Appwrite expertise |
| **B. Migrate to Supabase** (chosen) | Postgres + **Row Level Security** enforce privacy in the database; built-in Auth (email OTP); SQL functions for matching; Edge Functions for server-side notifications; schema and policies as **migrations in the repo**; local development stack via the Supabase CLI; free tier; skills transfer to any Postgres job | Learning curve (RLS); the free tier pauses inactive projects; the built-in auth email has low rate limits |
| C. Own backend (Node/Express + DB) | Full control | Hosting, auth and security all on us; not free to run reliably; too much for four part-time students |

## Decision

**Option B: Supabase.**
- Schema, RLS policies and functions live in `supabase/migrations` and are reviewed like code (#16, #17).
- Auth is Supabase Auth with email OTP (#18). Roles live in a `profiles` table (#19).
- The frontend talks to Supabase through a thin data-access layer (#20). The Appwrite SDK will be removed when the migration is complete.

## Existing Appwrite data

- **Not migrated.** The paused project only contains hackathon/demo records, and the people in it never agreed to a new system.
- Real users will register again on the new platform, with explicit consent.
- The Appwrite project stays paused and can be deleted by its owner once the Supabase version is live.

## Accounts and ownership

- Create the Supabase projects (staging first, production later) under an account or organization where **at least two release owners are admins**. This is tracked as part of #16.
- The same two-admin rule applies to Cloudflare (hosting), already used for CD.

## Consequences

- **Phase 0** continues with #16 (schema + migrations), #17 (RLS), #18 (auth), #19 (roles), #20 (data layer).
- UI fixes that do not depend on the backend can proceed in parallel; mock data mode is #47.
- **Free-tier pausing:** Supabase free projects are paused after a period of inactivity. Mitigations:
  - document the restore steps in `docs/DEVOPS.md`;
  - keep staging in regular use;
  - never let a single person be the only admin.
- **Email limits:** the built-in auth email is rate-limited; configure free custom SMTP before any public demo.
- Server-side notifications (#31) become mandatory, because RLS will hide donor emails from the browser.
