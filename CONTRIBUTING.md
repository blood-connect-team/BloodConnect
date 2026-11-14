# Contributing to Blood Connect

We are four part-time developers working **asynchronously**. Nobody should need a meeting to know what to work on. Every change follows:

**Issue → assign → task branch → commits → pull request → CI → review → approval → squash merge → Done**

Background: [blueprint Part E](BLOOD_CONNECT_PRODUCT_BLUEPRINT.md) · Automation and settings: [docs/DEVOPS.md](docs/DEVOPS.md) · Security: [SECURITY.md](SECURITY.md)

---

## 1. Set up once
```bash
nvm use            # Node 24 from .nvmrc (or install Node 24 LTS)
npm ci             # exact install from package-lock.json
cp .env.example .env.local   # fill in locally; never commit it
npm run dev
```
Before every PR: `npm run lint && npm test && npm run build`.

## 2. Find and claim a task

1. Open the GitHub Project → view **Ready to claim** (status *Ready*, no assignee). Pick by priority (P0 → P3), then the current milestone. Any workstream is fine.
2. Check **Blocked by**: every listed issue must be *Done*.
3. Check that nobody has claimed it: no assignee, no linked PR or branch.
4. **Assign yourself.** The assignee field is the single source of truth.
5. Set status **In Progress** and comment: `Claiming. Plan: <1–3 lines>. Draft PR soon.`

- **Collision:** if two people claim at the same time, the earliest assignment in the issue timeline wins. Never start on an issue assigned to someone else; ask in a comment instead.
- **Limit:** at most **2** issues In Progress per person (**1** if either is size L or XL).

**Definition of Ready** (needed before an issue moves Backlog → Ready):
- problem, expected behaviour and testable acceptance criteria
- scope and out-of-scope
- Priority, Size, Workstream, Phase and milestone set
- dependencies done or explicitly non-blocking
- size ≤ L
- no `needs-decision` label
- security/privacy notes for anything touching auth, access rules, personal data or notifications

New ideas use the **Feature idea** form and start in *Backlog* with `needs-triage`. They are not Ready until groomed.

## 3. Branches

Always branch from an up-to-date `main`. **One issue per branch. No personal long-lived branches.**
```bash
git switch main && git pull
git switch -c <type>/<issue-number>-<short-slug>
```

| Type | Use for | Example |
|---|---|---|
| `feat` | new behaviour | `feat/26-donor-response-flow` |
| `fix` | bug fix | `fix/5-dashboard-error-state` |
| `sec` | security fix | `sec/17-rls-policies` |
| `refactor` | no behaviour change | `refactor/20-data-layer-dashboard` |
| `test` | tests only | `test/21-vitest-setup` |
| `docs` | documentation | `docs/48-contributing` |
| `chore` | tooling, deps, config, CI | `chore/12-ci-workflow` |

**Keeping the branch current:**
- Before asking for review: `git pull --rebase origin main`, or use the PR's **Update branch** button.
- After review has started: merge `main` into your branch instead of force-pushing, so reviewers keep their context.
- `git push --force-with-lease` is only for your own branch, never for `main`.

## 4. Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary (#issue)`
```
fix(dashboard): show error state when requests fail to load (#5)
feat(requests): add units needed field (#28)
chore(ci): add lint/test/build workflow (#12)
```
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`. Use `fix(security): …` for security fixes.

**Never commit:**
- `.env*` files (except `.env.example`)
- keys or tokens
- database dumps
- real personal data

## 5. Open a pull request

1. Push and open a **draft PR** early. The first line of the description is `Closes #<issue>`, which links the issue and closes it on merge.
2. Fill the template: what and why, tests performed, screenshots at desktop **and** 375 px (synthetic data), the security/privacy and database checklists, known limitations.
3. **PR title = the squash commit message on `main`**, so use the commit format above.
4. Keep it small: aim for under ~400 changed lines (lockfiles excluded). Split bigger work.
5. Click **Ready for review**, move the issue to **In Review**, and request **one** reviewer. CODEOWNERS adds required reviewers automatically for sensitive paths: `.github/`, `src/services/`, `src/app/router/`, `scripts/`, dependency files, and the future `supabase/`.

**Automated checks on every PR:**

| Check | What it does | Must pass? |
|---|---|---|
| `ci` | `npm ci` → lint → tests → production build | **Yes** |
| `gitleaks` | Scans the PR's commits for secrets (values redacted) | Yes, once required by the owner. Fix it anyway. |

## 6. Reviews

- Reviewers aim to respond within **2 days**. If there is no response in 3 days, ask someone else in the weekly update.
- **Security-sensitive PRs need 2 approvals, including a code owner.** This covers auth, access rules/RLS, migrations, `scripts/`, `.github/`, and anything labelled `security-review`.

**Reviewers check:**
- **Correctness:** every acceptance criterion is met.
- **Tests:** present, and they fail without the change.
- **Security:** no secrets, no personal data in logs, minimum data sent to the browser, no privileged keys in frontend code.
- **UX:** works at 375 px, labelled inputs, clear loading/empty/error states, honest copy.
- **Scope:** no unrelated changes; follow-ups filed as issues.

Comment prefixes: `blocking:` (must change) · `suggestion:` · `question:` · `nit:` (optional) · `praise:`. Review the code, not the person. Don't push to someone else's branch without asking.

## 7. Resolve requested changes

1. The reviewer selects **Request changes**, and the issue moves to **Changes Requested**.
2. Push fixes as new commits (stale approvals are dismissed automatically).
3. Reply to each comment, or resolve it with a short note.
4. **Re-request review**, and the issue moves back to **In Review**.

All conversations must be resolved before merging.

## 8. Merge

When there is **≥1 approval** (2 for security-sensitive PRs), the `ci` check is **green** and every conversation is resolved, **the author** clicks **Squash and merge**.

- The issue closes and moves to **Done** automatically, and the branch is deleted.
- **Before approving**, the reviewer opens the PR's **View deployment** link (preview at `https://<branch>.blood-connect.pages.dev`) and checks the change works there.
- After merge, the production deploy **waits for an approver** (*Actions → Review deployments*). Once approved, it goes live at `https://blood-connect.pages.dev`. If something broke, roll back (docs/DEVOPS.md §10.2), open a bug linked to the PR and fix forward.

## 9. Release an issue you can't finish

1. Push your work-in-progress (keep the draft PR), or say that nothing is reusable.
2. Comment: what's done, what's left, gotchas, branch name.
3. Unassign yourself, set status back to **Ready**, and add the `help wanted` label.

**Stale claims:** no commit, comment or PR activity for 7 days → anyone may post a friendly check-in. Still no reply 3 days later → anyone may release it as above (keep the branch).

**Blocked:** set status **Blocked**, fill **Blocked by**, and comment the reason. If the blocker is a decision, add `needs-decision`.

## 10. Weekly async update

Post once a week in the team thread: **Done / Next / Blocked / Waiting for review**. Decisions are made in issues labelled `needs-decision`. Silence for 3 days after a clear proposal counts as consent, unless someone asks for more time. Architectural decisions are recorded as ADRs in `docs/adr/`.
