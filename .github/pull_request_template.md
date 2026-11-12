<!--
PR title format (it becomes the squash commit on main): type(scope): summary (#issue)
Example: fix(dashboard): show error state when loading fails (#5)
Use only synthetic data in screenshots, tests and descriptions.
-->

Closes #<!-- issue number; one issue per PR (or list each issue of an agreed bundle on its own "Closes" line) -->

## What changed
<!-- A short list of user-visible or developer-visible changes. -->

## Why
<!-- The problem this solves. Link audit/blueprint IDs if relevant (e.g. BUG-007, ISSUE-05). -->

## Implementation summary
<!-- Key decisions, files touched, anything a reviewer should look at first. -->

## Tests performed
- [ ] `npm run lint` passes
- [ ] `npm test` passes (new or updated tests listed below)
- [ ] `npm run build` passes
- [ ] Every acceptance criterion of the linked issue checked:
  - [ ] <!-- criterion -->
- [ ] UI changes checked at desktop width **and** 375 px mobile width

## Screenshots (UI changes only, synthetic data)
| Before | After |
|---|---|
|  |  |

## Security and privacy checklist
- [ ] No secrets, API keys, tokens or passwords added (code, tests, docs, screenshots, logs)
- [ ] No real donor, requester or patient data anywhere in this PR
- [ ] No new `console.log` of personal data (names, phones, emails)
- [ ] No privileged/server-only key used in frontend code or in `VITE_*` variables
- [ ] Data returned to the browser is the minimum needed
- [ ] If auth, access rules, scripts or `.github/` changed: `security-review` label added (needs 2 approvals incl. a code owner)

## Database migration checklist
- [ ] No database change in this PR
- [ ] OR: new migration added (an existing migration was **not** edited)
- [ ] OR: access rules (RLS) enabled and tested for every new table
- [ ] OR: seed data is synthetic only

## Known limitations
<!-- What this PR deliberately does not do; link follow-up issues. -->

## Notes for reviewers
<!-- How to test locally, risky areas, questions. -->
