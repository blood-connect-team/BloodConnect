# Blood Connect

Connects people who urgently need blood with registered voluntary donors in the same area. A university team project (React + Vite) that is being turned from a hackathon prototype into a maintained product.

> **Status:** the current backend (Appwrite Cloud) is **paused**, so registration, login and requests do not work against a live database right now. A migration to Supabase is planned. See [`BLOOD_CONNECT_PRODUCT_BLUEPRINT.md`](BLOOD_CONNECT_PRODUCT_BLUEPRINT.md).

## Tech stack
React 19 · React Router 7 · Vite 8 · Tailwind CSS 4 · Appwrite JS SDK (to be replaced by Supabase) · EmailJS · Node 24 LTS

## Getting started
```bash
nvm use                      # Node 24 (from .nvmrc)
npm ci                       # install exactly what package-lock.json lists
cp .env.example .env.local   # then fill in values locally (never commit .env.local)
npm run dev                  # http://localhost:5173
```

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | ESLint (must pass in CI) |
| `npm test` | Unit tests with Node's built-in test runner (`src/**/*.test.js`) |
| `npm run build` | Production build into `dist/` (must pass in CI) |
| `npm run preview` | Serve the production build locally |
| `npm run check-connections` | Connection checks for Appwrite/EmailJS (reads `.env.local` if present; never prints credential values) |

## Environment configuration
Copy `.env.example` to `.env.local`.
- Variables starting with `VITE_` end up in the **public** browser bundle, so they must only hold public identifiers.
- Server secrets (e.g. `APPWRITE_API_KEY`) are only for Node scripts and must never get a `VITE_` prefix.
- `.env` and `.env.*` files are git-ignored (except `.env.example`).

Where each secret belongs: [docs/DEVOPS.md §9](docs/DEVOPS.md#9-environments-and-secrets).

## Testing
`npm test` runs unit tests for pure utilities. React component tests (Vitest + Testing Library) are planned in ISSUE-21. CI runs lint, tests and a production build on every pull request and every push to `main`.

## Contributing
Work is tracked in GitHub Issues and the "Blood Connect" GitHub Project.
1. Claim a **Ready** issue.
2. Work on a task branch (`fix/5-dashboard-error-state`).
3. Open a PR with `Closes #5`.
4. Pass CI and get a review.
5. Squash-merge.

Full guide: [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation
- [CONTRIBUTING.md](CONTRIBUTING.md): how we claim, branch, commit, review and merge
- [docs/DEVOPS.md](docs/DEVOPS.md): CI, secret scanning, Dependabot, branch protection, environments, deployment, releases
- [SECURITY.md](SECURITY.md): reporting vulnerabilities, leaked credentials, data exposure
- [BLOOD_CONNECT_PRODUCT_AUDIT.md](BLOOD_CONNECT_PRODUCT_AUDIT.md): product, code and security audit
- [BLOOD_CONNECT_PRODUCT_BLUEPRINT.md](BLOOD_CONNECT_PRODUCT_BLUEPRINT.md): validated backlog, roadmap, workstreams, workflow

<details>
<summary>Original Vite template notes</summary>

This project started from the React + Vite template, which provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

**React Compiler:** not enabled because of its impact on dev and build performance. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

**Expanding the ESLint configuration:** for a production application, TypeScript with type-aware lint rules is recommended. See the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) and [`typescript-eslint`](https://typescript-eslint.io).

</details>
