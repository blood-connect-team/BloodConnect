# AGENTS.md: rules for AI coding agents (and the humans driving them)

This is the **one standard** for everyone who works on Blood Connect with an AI tool: Claude Code, Codex, Antigravity, Gemini, Cursor, Copilot or anything else. Every tool-specific file (`CLAUDE.md`, `GEMINI.md`, `.agent/rules/`, `.github/copilot-instructions.md`) only points here. **Change the rules here, nowhere else.**

Human process (claiming issues, reviews, releases) is in [CONTRIBUTING.md](CONTRIBUTING.md). Security reporting is in [SECURITY.md](SECURITY.md). Architecture decisions are in [docs/adr/](docs/adr/).

---

## 0. Before writing any code (agent: do this every session)

1. Read this file, then the **issue** you are working on (acceptance criteria are the definition of done).
2. Read the files you will change **and** their neighbours. Reuse what exists (section 4) before creating anything.
3. Work on a branch named `<type>/<issue-number>-<short-slug>` from an up-to-date `main` (never on `main`).
4. Keep the change to **one issue**. If you notice other problems, list them in the PR under *Known limitations*; do not fix them in passing.
5. If the request conflicts with a rule here, **stop and tell the human**; do not quietly work around it.

## 1. What the project is

Connects people who urgently need blood with registered voluntary donors in the same city (Pakistan). Privacy matters more than features: donors are **never** browsable; contact details are shared only after a donor accepts a specific request.

**Stack:** React 19 · React Router 7 (`createBrowserRouter`) · Vite 8 · Tailwind CSS 4 · Supabase (Postgres, Auth with email login link/code, Row Level Security) · `lucide-react` icons · `react-hot-toast` · Node 24 (`.nvmrc`) · npm (lockfile committed). Hosting: Cloudflare Pages. CI: GitHub Actions.

## 2. Commands

| Command | Purpose |
|---|---|
| `npm ci` | Install exactly what `package-lock.json` lists |
| `npm run dev` | App at http://localhost:5173 |
| `npm run check` | **Lint + tests + build. Must pass before every commit you propose.** |
| `npx supabase start` | Local database + auth (Docker); login emails go to Mailpit http://127.0.0.1:55324 |
| `npx supabase db reset` | Re-create the local DB from `supabase/migrations` + `seed.sql` |
| `npx supabase test db` | Database tests (pgTAP) in `supabase/tests/database` |

Use the Supabase CLI version pinned in CI (`npx --yes supabase@3.2.0 …`) if your global one differs.

## 3. Where things go

```
src/
  app/            providers (AuthProvider), router (routes, ProtectedRoute), layouts
  pages/<Name>/   one folder per route, index.jsx; page = UI + calls to services
  components/     shared UI only (common/, navigation/, forms/)
  services/       ALL Supabase calls live here (auth.js, profile.js, requests.js, errors.js)
  lib/supabase.js the single Supabase client
  utils/          pure functions + their *.test.js (no React, no network)
supabase/
  migrations/     schema + RLS, one new timestamped file per change
  tests/database/ pgTAP tests for schema and RLS
  seed.sql        synthetic data only
docs/adr/         architecture decisions
```

## 4. Reuse, don't re-invent (main tech-debt guard)

| Need | Use | Never |
|---|---|---|
| Talk to the database | a function in `src/services/*`, built with `unwrap()` from `services/errors.js` | `supabase.from(...)` inside a page or component |
| Current user / profile / donor | `useAuth()` from `app/providers/auth-context` | reading `localStorage`, fetching the profile again |
| Protect a page | wrap the route in `<ProtectedRoute>` in `app/router/index.jsx` | redirect logic inside the page |
| Phone numbers | `normalizePhone()` / `whatsAppLink()` from `utils/phone.js` (stores E.164 `+92…`) | a new regex |
| Blood groups, urgency levels | `BLOOD_GROUPS`, `URGENCY_LEVELS` from `services/requests.js` | hard-coded lists |
| Cities | `listCities()` (table `public.cities`) | hard-coded city lists |
| Class names | `cn()` from `utils/cn.js` | string concatenation helpers |
| Notifications to the user | `toast` from `react-hot-toast` | `alert()` |
| Icons | `lucide-react` | new icon packages |

Before adding a helper, **search** the repo for one that does the same thing. If two exist, merge them in a separate `refactor/` PR.

## 5. Code rules

- **JavaScript + JSX** (no TypeScript yet). ES modules, function components, hooks. Keep the existing style (2 spaces, single quotes, semicolons).
- **Every data screen handles 4 states:** loading, error (with a readable message), empty, and data. No blank screens, no silent failures.
- **Forms:** every input has a `<label htmlFor>`; validate on submit; show the error next to the field and focus the first invalid one (see `pages/Register`).
- **No fake data in the UI.** No hard-coded donors, counts or "success" without a real result.
- **Errors:** throw/return through `unwrap()`; show `error.message` with `toast.error`. No `console.log` of personal data; remove debug logs before committing.
- **Effects:** follow the `react-hooks` lint rules (no `setState` directly in an effect body; use the pattern in `pages/Dashboard`).
- **Files:** a page over ~300 lines should be split into components in its own folder. No commented-out code, no unused files or exports: delete what you replace.
- **Dependencies:** do not add a package unless the issue needs it and nothing in section 4 covers it. Say why in the PR. Never add a second library for the same job (one router, one icon set, one toast, one date approach).
- **Mobile first:** check at 375 px and desktop.

## 6. Database and security (non-negotiable)

- **Schema changes only through a new migration** in `supabase/migrations/` (`npx supabase migration new <name>`). Never edit a migration that is already on `main`. Never change the hosted database by hand.
- **Every table has RLS enabled** and explicit `grant`s (new tables are *not* exposed automatically). Deny by default.
- Any change to policies, grants or `security definer` functions **must** come with pgTAP tests in `supabase/tests/database/` and the `security-review` label.
- `security definer` functions: `set search_path = ''`, fully qualified names, `revoke ... from public, anon`, then grant only what is needed.
- Only the **publishable/anon key** may appear in frontend code or `VITE_*` variables. The service-role/secret key and database passwords never go in the repo, the browser, logs, screenshots or chat with an AI tool.
- **Never paste real personal data** (donors, patients, phone numbers, emails) into an AI tool, a test, a seed file, a screenshot or a PR. Use synthetic data (`0300 0000000`, `*@example.test`).
- Never commit `.env*` (except `.env.example`). If a secret leaks, follow SECURITY.md (rotate first).

## 7. Testing and verifying

- Pure logic in `src/utils` or `src/services` gets a `*.test.js` next to it (Node's built-in `node:test`, see `utils/phone.test.js`).
- Run `npm run check` before proposing a commit. CI runs the same plus gitleaks and database checks; a red CI is never "someone else's problem".
- **See it running:** every PR gets a preview at `https://<branch>.blood-connect-65z.pages.dev` (staging database). Log in with the shared **dev / test account** (box on the login page, previews only; the code is shared privately by the team leads, never committed). Locally, use `npx supabase start` + Mailpit.
- Do not claim something works unless you ran it. Say what you did not verify.

## 8. Git and pull requests

- Conventional commits: `type(scope): summary (#issue)` with `feat | fix | refactor | test | docs | chore | ci`.
- **Author is the human.** Do not add AI co-author lines or "Generated with …" footers to commits or PRs.
- One issue per PR, ideally under ~400 changed lines. First line of the description: `Closes #<issue>`. Fill the PR template, including **AI usage** and both checklists.
- Never push to `main`, never force-push someone else's branch, never disable or skip CI, hooks or lint rules to get green. Fix the cause.

## 9. When to stop and ask a human

- The change needs a new dependency, a new service/vendor, or touches billing, auth settings or production.
- It changes RLS, grants, migrations already on `main`, CI workflows or `.github/`.
- The issue is unclear, or the acceptance criteria conflict with this file.
- A big design choice is involved: write a short ADR in `docs/adr/` (copy the format of `0001`) and get it agreed first.

## 10. Known legacy (do not copy these patterns)

Leftovers from the hackathon that are scheduled for cleanup: `pages/Notifications`, `pages/Confirmation`, `pages/Admin` (admin check comes in #19), `components/navigation/Sidebar.jsx`, `components/forms/Input.jsx`, `utils/bloodGroupNormalizer.js`. Use the patterns in `pages/Register`, `pages/Dashboard`, `pages/EmergencyRequest` and `services/*` instead.
