# Blood Connect — DevOps Guide

How code gets from a branch to `main` safely, and what is automated versus what a person must do.
Planning background: [`BLOOD_CONNECT_PRODUCT_BLUEPRINT.md`](../BLOOD_CONNECT_PRODUCT_BLUEPRINT.md) (Part E).
Day-to-day workflow for contributors: [`CONTRIBUTING.md`](../CONTRIBUTING.md). Security: [`SECURITY.md`](../SECURITY.md).

```
Issue → assign → task branch → commits → PR ──► CI "ci" (install · lint · test · build)
                                            ├─► Secret scan "gitleaks" (PR commits only)
                                            └─► Review (CODEOWNERS for sensitive paths)
                                                   └─► approval + green checks → squash merge → issue Done
push to main ──► CI "ci" again (catches combinations of PRs that are fine alone)
```

## Contents
1. [CI pipeline](#1-ci-pipeline)
2. [Tests](#2-tests)
3. [Secret scanning](#3-secret-scanning)
4. [Dependabot](#4-dependabot)
5. [Branch protection and required checks](#5-branch-protection-and-required-checks)
6. [Repository visibility](#6-repository-visibility)
7. [Branches](#7-branches)
8. [GitHub Project, labels and milestones](#8-github-project-labels-and-milestones)
9. [Environments and secrets](#9-environments-and-secrets)
10. [Deployment](#10-deployment)
11. [Release process](#11-release-process)
12. [Common CI failures and fixes](#12-common-ci-failures-and-fixes)
13. [Admin and team checklists](#13-admin-and-team-checklists)

---

## 1. CI pipeline

File: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) · **Required status check name: `ci`**

| Item | Setting |
|---|---|
| Triggers | `pull_request` targeting `main`, `push` to `main`, manual `workflow_dispatch` |
| Runner | `ubuntu-latest`, timeout 15 min |
| Node.js | From [`.nvmrc`](../.nvmrc) (`24`, current LTS; matches local development; Vite 8 needs ≥ 20.19 / 22.12) |
| Install | `npm ci` (exact lockfile install; fails if `package.json` and `package-lock.json` disagree), npm cache via `actions/setup-node` |
| Steps | `npm run lint` → `npm test` → `npm run build` (any failure fails the check) |
| Permissions | `contents: read` only; checkout does not persist credentials |
| Concurrency | A new push to the same PR cancels the older run; pushes to `main` are never cancelled |
| Action pinning | Actions are pinned to full commit SHAs with the version in a comment; Dependabot updates them monthly |

**No `paths-ignore`, on purpose.** `ci` is a required check. A docs-only PR that skipped the workflow would wait forever for it.

**Build environment variables:** none are needed. Vite only inlines `VITE_*` values that exist, and the app reports missing configuration at runtime. CI therefore uses **no** fake or real credentials.

**Lockfile note (verified):** with npm 11 (Node 24), `npm ci` fails on the lockfile committed at `2fd0524` with `Missing: @emnapi/core … from lock file`. The regenerated `package-lock.json` in the working tree fixes this. **It must be committed together with the CI workflow**, otherwise the first CI run fails at install.

**Cost:** public repositories run standard GitHub-hosted runners for free. Private repositories use the account's included monthly Actions allowance (GitHub Free $12 / Pro $18 of usage, roughly 2,000 / 3,000 Linux minutes at the documented $0.006/min). One `ci` run takes a few minutes, which is ample for four people. Check *Settings → Billing → Usage* monthly.

## 2. Tests

- **Now:** Node's built-in test runner (no extra dependency). `npm test` runs `node --test "src/**/*.test.js"`. It exits non-zero on failure and never uses watch mode. First suite: [`src/utils/bloodGroupNormalizer.test.js`](../src/utils/bloodGroupNormalizer.test.js).
- The explicit glob matters: Node's default discovery would also pick up `src/services/test.js`, an old manual script that cannot run (audit BUG-019).
- **Gap:** there are no component (React) tests yet. **ISSUE-21** adds Vitest + React Testing Library. When it lands, switch the `test` script to Vitest. CI needs no change, because it always runs `npm test`.

## 3. Secret scanning

File: [`.github/workflows/secrets.yml`](../.github/workflows/secrets.yml) · **Check name: `gitleaks`**

- Runs the open-source [Gitleaks CLI](https://github.com/gitleaks/gitleaks) `8.30.1` directly. It is downloaded from the official release and **checksum-verified** in the job.
- Why not `gitleaks-action`: the action requires a licence key for organization-owned repositories. The CLI is free with no sign-up.
- **What is scanned:** on a PR, only that PR's commits (`base..head`); the full history is not rescanned each time. A manual run (*Actions → Secret scan → Run workflow*) scans the whole history; do this occasionally.
- **Output:** gitleaks runs with `--redact`, so values are masked in the logs. The workflow has read-only permissions.
- **Version bumps:** Dependabot does not update `GITLEAKS_VERSION` in the workflow. Bump it deliberately in a PR.
- **Limits:** gitleaks matches known key formats and high-entropy strings. It will **not** catch everything; for example, short service or template identifiers like the EmailJS IDs found in this repo may not match any rule. It does not replace review, and it never replaces **rotating** an exposed credential.

**When gitleaks fails:**
1. Open the job log to see the rule, file, line and commit (the value is redacted).
2. **If it is a real secret:** follow [SECURITY.md → leaked credentials](../SECURITY.md#if-a-credential-leaks). Rotate first. Removing it from the branch is not enough, because it is already in the PR's commits.
3. **If it is a false positive** (e.g. an obviously fake test string):
   - Preferred: change the test value so it no longer looks like a secret.
   - Otherwise, add an inline `gitleaks:allow` comment on that line.
   - Or add the finding's *fingerprint* to a `.gitleaksignore` file at the repo root, with a comment explaining why.
   - Either way, the PR needs a code-owner review.
   - Never allowlist a value that is or was a real credential.

**GitHub's own secret scanning:** free for public repositories (enable it with `scripts/setup-github.sh security`, §5). For private repositories it is a paid product, so there Gitleaks is the only automated scan.

## 4. Dependabot

File: [`.github/dependabot.yml`](../.github/dependabot.yml)

| Ecosystem | Schedule | Grouping | Max open PRs |
|---|---|---|---|
| npm | weekly, Monday 06:00 Asia/Karachi | minor+patch: one PR for dev deps, one for prod deps. **Majors: one PR each** | 4 |
| GitHub Actions | monthly | all actions in one PR | 2 |

- A 7-day **cooldown** means a release is only proposed after it has been out for a week. Security updates are not delayed.
- Commit messages follow the conventions (`chore(deps): …`, `chore(deps-dev): …`, `ci: …`).
- Labels `dependencies` and `type:chore` are applied if they exist (create them with the setup script). Missing labels are ignored.

**How the team handles Dependabot PRs** (every one goes through CI and review like any PR):

| Kind | Handling |
|---|---|
| **Patch** (grouped) | CI green + quick review of the changelog summary → merge. |
| **Minor** (grouped) | CI green; run `npm run dev` and click through the main pages once; merge. If one package breaks the group, comment `@dependabot ignore <package> minor version` for that one and open an issue. |
| **Major** (single) | Treat as a task: read the migration guide, create a linked issue if code changes are needed, test locally, then merge. Fine to leave open for a while; close it if not worth it now. |
| **Security alert / security update PR** | Highest priority. An admin enables Dependabot alerts and security updates (§8, `security` step). Fix within days. If only a dev/build-tool is affected (e.g. a linter dependency), note that and fix in the next maintenance PR. |

Do not bulk-update dependencies by hand (`npm update` / `npm audit fix --force`). Let Dependabot propose changes so CI and review validate them.

## 5. Branch protection and required checks

### 5.1 Target configuration for `main`

| Setting | Value |
|---|---|
| Require a pull request before merging | on |
| Required approving reviews | **1** (team convention: **2** for security-sensitive PRs, incl. a code owner) |
| Dismiss stale approvals when new commits are pushed | on |
| Require review from Code Owners | on (paths in [`.github/CODEOWNERS`](../.github/CODEOWNERS)) |
| Require conversation resolution | on |
| Required status checks | **`ci`** (add **`gitleaks`** after its first green run) |
| Require branch to be up to date | off (saves CI minutes; the push-to-`main` CI run catches combined breakage) |
| Include administrators (`enforce_admins`) | on (the owner follows the same rules) |
| Allow force pushes / deletions | off / off |
| Merge settings | squash merge only, PR title as commit title, auto-delete head branches, "Update branch" button on |

### 5.2 Plan requirement: who can actually enforce this

The repository is owned by the **`blood-connect-team` organization on the GitHub Free plan**.
- **Public repo (current):** branch protection, required reviews and CODEOWNERS enforcement are available for free.
- **Private repo:** on a *free organization* these are **not** available; they need the paid GitHub Team plan. (The Student Developer Pack's free Pro applies to personal accounts, not organizations.) Keep the repo **public** to stay free and enforced.
- Organization **owners/admins** can apply every setting in this document. Give at least two team members the owner role so nobody is a bottleneck.
- **Bootstrapping:** required reviews need a second person who can approve. Apply branch protection once at least one other team member has joined the organization with write access.

### 5.3 How to apply (organization admin)
```bash
# 1. Preview exactly what will change (no changes are made):
scripts/setup-github.sh branch-protection
# 2. After the CI workflow is on main and has run once, apply:
scripts/setup-github.sh --apply branch-protection
# 3. Later, also require the secret scan:
REQUIRED_CHECKS="ci gitleaks" scripts/setup-github.sh --apply branch-protection
```
- Needs [GitHub CLI](https://cli.github.com/), `gh auth login` as an organization admin. Use Git Bash, WSL or macOS/Linux.
- UI alternative: *Settings → Branches → Add branch protection rule* for `main`, with the values in §5.1.
- **Verify:** open a test PR with a deliberate lint error. The `ci` check fails and the merge button stays blocked. Then push the fix.
- **Emergency:** if `main` is broken and no reviewer is reachable, an organization admin may temporarily disable "Include administrators", merge the fix, and re-enable it. Record this in the PR description.

## 6. Repository visibility

The repository is **public** and should stay public: on a free organization, a private repository loses branch protection, required reviews and CODEOWNERS enforcement (§5.2), and GitHub secret scanning is free only for public repositories.

Because the code and issues are public:
- never commit secrets or real personal data (SECURITY.md);
- keep detailed security findings and exploit steps out of issues and PRs; share them privately with the team;

## 7. Branches

Only `main` and short-lived task branches exist here (no personal branches). Merged branches are deleted automatically once `repo-settings` is applied (§8). Old personal branches from the original hackathon repository were not copied.

## 8. GitHub Project, labels and milestones

[`scripts/setup-github.sh`](../scripts/setup-github.sh) prepares these **idempotently**:
- labels are created or updated, never duplicated
- milestones are created only if missing
- a project is reused if one titled "Blood Connect" exists

It is a **dry run unless `--apply`** is given:
```bash
scripts/setup-github.sh all                 # preview: labels, milestones, repo settings, security, project
scripts/setup-github.sh --apply labels      # apply one step at a time after approval
```

| Step | What it changes |
|---|---|
| `labels` | 28 labels from the blueprint catalogue (type/area/flags). Priority, size, workstream and phase are **Project fields, not labels**. GitHub's default labels are left untouched; delete unused ones by hand if wanted. |
| `milestones` | The 15 roadmap milestones (`M0.1 Decisions & repo safety` … `M3.4 Platform review`), no due dates |
| `repo-settings` | Squash-only merges, PR title as commit title, auto-delete merged branches, "Update branch" button |
| `security` | Dependabot alerts + security updates. If public: private vulnerability reporting, secret scanning, push protection. |
| `project` | Project "Blood Connect" + fields Priority (P0–P3), Size (XS–XL), Workstream (A–D), Phase (0–3), Blocked by (text); links it to the repo. Needs `gh auth refresh -s project`. |
| `branch-protection` | §5 (not included in `all`) |

**Manual Project steps (web UI; no CLI support):**
1. *Status* field options, in order: Backlog, Ready, In Progress, In Review, Changes Requested, Blocked, Done.
2. Views:
   - **Board**: board layout, grouped by Status.
   - **Ready to claim**: table, filter `status:Ready no:assignee`, sorted by Priority.
   - **My work**: filter `assignee:@me -status:Done`.
   - **By workstream**: board, grouped by Workstream.
   - **Roadmap**: roadmap layout, by milestone.
   - **Triage**: filter `status:Backlog`.
3. Workflows (*⋯ → Workflows*):
   - Item added → Backlog
   - Item closed → Done
   - Pull request merged → Done
   - Item reopened → Backlog
   - Auto-add to project: this repo, `is:issue`
4. Status rules, the Definition of Ready and WIP limits are in [CONTRIBUTING.md](../CONTRIBUTING.md).

**Not done by the script, on purpose:** creating backlog issues. Issues are created separately and deliberately (blueprint §E-Q). Creating the 44 audit issues first keeps `#1–#44` equal to `ISSUE-01…44`.

## 9. Environments and secrets

| Environment | Frontend | Backend | Data | Status |
|---|---|---|---|---|
| **Local** | `npm run dev` | Appwrite Cloud via `.env.local` (project currently **paused**); later Supabase local stack or the mock mode (blueprint NEW-03) | Synthetic only | Works for UI; backend calls fail while Appwrite is paused |
| **Staging** | PR preview deployments + a staging URL | Future Supabase project "staging" | Synthetic + team test accounts | Not set up (needs hosting decision + Supabase migration) |
| **Production** | Deploy from `main` | Future Supabase project "production" | Real users | **Disabled** until the beta gate (blueprint Part C) |

Local development never needs production credentials.

| Value | Where it belongs | Never |
|---|---|---|
| `VITE_*` frontend config (Appwrite endpoint/IDs today; later `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) | `.env.local`; hosting provider env vars per environment; GitHub Actions **variables** only if a workflow ever needs them | Anything secret: `VITE_*` values are public in the browser bundle |
| Supabase **service-role** key | Supabase Edge Function secrets only | Frontend, `VITE_*`, `.env.example`, GitHub YAML, chat |
| Database password, Supabase access token (CLI deploys) | GitHub **environment secrets** (e.g. `staging`), only if deploys are automated | Logs, code |
| Email provider API key, CAPTCHA secret | Supabase Edge Function secrets | Frontend |
| Hosting deploy token (only if CI deploys instead of the host's Git integration) | GitHub environment secret | Code |
| `APPWRITE_API_KEY` (scripts) | Your shell or `.env.local`, never `VITE_` prefixed | Commits |
| EmailJS IDs (scripts) | `.env.local` (`EMAILJS_*` or `VITE_EMAILJS_*`) | Hard-coded fallbacks (removed) |

`.gitignore` ignores `.env` and `.env.*` (except `.env.example`), plus `*.dump`, `*.backup` and `/backups/`. Every external account (Appwrite, EmailJS, Supabase, hosting) should have **at least two** team admins.

## 10. Deployment

**Current state (verified):** no hosting provider or deployment configuration exists in the repo (no `vercel.json`, `netlify.toml`, `wrangler.*`, `_redirects` or `_headers`), and no deployment is referenced. **Nothing has been deployed.**

**Free-tier comparison** (vendor pages read on 2026-11-12; re-check before signing up):

| | Cloudflare Pages (Free) | Netlify (Free) | Vercel (Hobby) |
|---|---|---|---|
| Builds | 500/month, 1 concurrent | Credit-based: 300 credits; a production deploy costs 15 | 100 deployments/day |
| Preview deployments | Unlimited | Unlimited deploy previews | Yes |
| Usage restrictions | none stated on the limits page | none found | **Non-commercial, personal use only**; no team collaboration features |
| SPA routing | Automatic when there is no top-level `404.html` | Needs a `_redirects` rule | Needs `vercel.json` rewrites |
| Headers file | `_headers` | `_headers` | `vercel.json` |

**Recommendation: Cloudflare Pages.** It has the most generous build allowance, no non-commercial clause, SPA routing without extra config, and team members can be added to the Cloudflare account. **Do not create it until the owner approves (blueprint decision D-06).**

**Deployment design (once approved):**
1. Connect the repo through the Cloudflare Pages GitHub integration. Build command `npm run build`, output `dist`, Node version from `.nvmrc` (or set `NODE_VERSION=24`).
2. **Preview deployments:** every PR branch gets a preview URL, configured with *Preview* environment variables pointing to the **staging** backend (synthetic data only).
3. **Staging:** the preview environment of `main`, or a dedicated `staging` branch alias.
4. **Production:** the production branch is `main`. Keep **automatic production deployments disabled** until the beta gate; deploy production manually from the dashboard after a release is tagged.
5. **Security headers:** add `public/_headers` in the hosting PR:
   ```
   /*
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     X-Frame-Options: DENY
     Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```
   Add a Content-Security-Policy after the Supabase migration, when the backend domains are final.
6. **Rollback:** in the Cloudflare dashboard → *Deployments*, pick the last good deployment → *Rollback*. Then fix forward with a PR, or revert the bad PR (`git revert`) through a new PR.

## 11. Release process

Versions (blueprint): `v0.1.0` Foundation · `v0.2.0` Beta readiness · `v0.3.0` Product improvements · `v1.0.0` Public launch decision · patch versions (`v0.2.1`) for hotfixes. **No tags or releases exist yet.**

At the end of a phase (or for a hotfix):
1. All issues in the milestone are Done or explicitly moved; `main` has a green `ci` run.
2. *Releases → Draft a new release* → new tag (e.g. `v0.1.0`) on `main`.
3. *Generate release notes*: grouped by labels via [`.github/release.yml`](../.github/release.yml) (Security, Features, Fixes, Improvements, Docs/tests/chores, Other).
4. Edit the summary (known limitations, migration notes) → publish.
5. Once hosting exists, deploy production from that commit (§10). Close the milestone.

## 12. Common CI failures and fixes

| Symptom | Cause | Fix |
|---|---|---|
| `npm ci` → `Missing: <pkg> from lock file` / `not in sync` | `package-lock.json` doesn't match `package.json`, or was written by a different npm major | Use Node 24 (`nvm use`, reads `.nvmrc`), run `npm install`, commit the lockfile in the same PR |
| `Cannot find module @rolldown/binding-linux-x64-gnu` (or `lightningcss-linux…`, `@tailwindcss/oxide-linux…`) | Lockfile generated without optional platform packages | Regenerate with plain `npm install` (no `--omit=optional`, no `--no-optional`) and commit |
| Lint step fails | ESLint errors in changed code | `npm run lint` locally and fix. Do not disable rules to get green; if a rule is wrong for the project, change it in its own PR with a justification. |
| Test step fails | A test fails | `npm test` locally. Tests never run in watch mode in CI. |
| Build fails | Import or syntax error, missing file (case-sensitive on Linux) | `npm run build` locally. Check file-name **case** (Windows ignores it, Linux doesn't). |
| Check `ci` stays "Expected — waiting for status" | PR doesn't target `main`, workflow file broken, or required check name changed | Target `main`. Keep the job `name: ci`. Check the *Actions* tab for a YAML error. |
| `gitleaks` fails | A secret-like string in the PR commits | §3 |
| `scripts/setup-github.sh: $'\r': command not found` | Script checked out with CRLF line endings | `.gitattributes` forces LF; re-checkout the file (`git rm --cached scripts/setup-github.sh && git checkout -- scripts/setup-github.sh`) |
| Dependabot PRs have no labels | Labels don't exist yet | Run `scripts/setup-github.sh --apply labels` |

## 13. Admin and team checklists

**Organization admins:**
- [ ] Invite the other team members to `blood-connect-team` (Owner role for at least one more person; Member with write access for the rest).
- [ ] Make sure the EmailJS credentials committed in the original hackathon repository were rotated (SECURITY.md → *Known open item*). Confirm in an issue **without pasting any value**.
- [ ] Review and merge the DevOps PR (CI workflow + lockfile + templates + docs).
- [ ] Run `scripts/setup-github.sh` (dry run), then `--apply` for: `repo-settings`, `security` (labels, milestones and the Project are already set up).
- [ ] Configure the Project's views and workflows (§8).
- [ ] After a second member has joined: apply branch protection (§5.3) and verify it with a failing test PR.
- [ ] Add every member's GitHub username to `.github/CODEOWNERS` (owners must have write access).
- [ ] Decide on hosting (§10) before any deployment work.

**Every team member:**
- [ ] Accept the organization invitation; share your exact GitHub username.
- [ ] Clone the organization repository (`git clone https://github.com/blood-connect-team/BloodConnect.git`), or point your existing clone at it: `git remote set-url origin https://github.com/blood-connect-team/BloodConnect.git`.
- [ ] Install Node 24 (`.nvmrc`). Run `npm ci`, `npm run lint`, `npm test`, `npm run build` once locally.
- [ ] Read [CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](../SECURITY.md).
- [ ] Work only on task branches.
