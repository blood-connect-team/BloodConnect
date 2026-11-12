# Security Policy

Blood Connect handles personal information about blood donors, requesters and patients. Please help keep it safe.

## Supported versions

Only the current `main` branch is supported. There are no released versions yet.

## Reporting a vulnerability (privately)

**Never report a vulnerability, leaked credential or personal-data exposure in a public issue, pull request, discussion or commit message.**

- **Outside reporters** (while the repository is public): use **Security → Report a vulnerability** on the repository page (GitHub private vulnerability reporting, once the owner has enabled it). If that button is missing, contact the repository owner privately through their GitHub profile and ask for a private channel. Do not include details in that first message.
- **Team members:** message the repository owner **and** one other team member privately (direct message, not a group with outsiders). If you believe a fix is urgent, say so in the first line.

Please include: what is affected, how to reproduce (with synthetic data), and the possible impact. We aim to acknowledge reports within 3 days. This is a volunteer student team, so we can't promise faster, but we take every report seriously.

## What must never be posted publicly

Not in issues, PRs, discussions, commit messages, screenshots or chat channels with outsiders:
- API keys, tokens, passwords, service-role or admin keys, `.env` file contents
- Real donor, requester or patient data (names, phone numbers, emails, blood groups linked to a person, locations)
- Database exports or dumps
- Step-by-step exploit details before a fix is merged

Use synthetic data (e.g. `Test Donor`, `+923000000000`, `donor@example.com`) everywhere.

## If a credential leaks

1. **Rotate or revoke it first**, at the provider (EmailJS, Appwrite, Supabase, hosting…). Only an account admin can do this; tell them immediately. Deleting the line from the code does **not** help: the value stays in git history and in anyone's clone.
2. Remove it from the code in a normal PR. The replacement must read from environment variables (see `.env.example`).
3. Check the provider's logs or usage for misuse since the leak.
4. Do **not** rewrite git history unless the team explicitly decides to. Rotation is what makes the old value useless.
5. Record what happened (what leaked, when, which key was rotated, by whom) in a private note shared with the team. Never paste the value itself.
6. If the secret scan (Gitleaks) flagged it in a PR, keep the PR open until rotation is confirmed.

## If donor or requester data may be exposed

1. **Stop the exposure:** disable the affected feature or route (revert the PR), revoke keys, or tighten access rules. Speed matters more than a perfect fix.
2. Privately notify the repository owner and the team **within 24 hours** of noticing.
3. Work out the scope: which data, how many people, since when, who could access it. Use logs, not guesses.
4. Fix the root cause with a reviewed PR (two approvals, including a code owner).
5. Decide as a team, with appropriate advice where needed, whether and how affected people must be informed. Legal obligations depend on the jurisdiction and are not assessed in this repository.
6. Write a short private post-incident note: cause, impact, fix, and what prevents a repeat.

## Known open item

Hard-coded EmailJS identifiers (service ID, template ID, public key) were committed in `scripts/check-connections.js` on 2026-05-12, while the repository was public. The code now reads them from environment variables only. **The EmailJS account owner still has to rotate them:**
- regenerate the EmailJS public key, and revoke the old one if the dashboard offers it
- create a new email service or template if the old IDs can be abused, and delete the old ones
- restrict allowed origins/domains in the EmailJS security settings, if available

Until the owner confirms this in an issue (without pasting values), treat the old identifiers as compromised.

## Automated protections

- Secret scanning on every pull request (Gitleaks, `.github/workflows/secrets.yml`)
- Dependency updates and security alerts (Dependabot)
- Required CI checks, code-owner review for sensitive paths, and branch protection (when enabled by the owner)

Details: [docs/DEVOPS.md](docs/DEVOPS.md).
