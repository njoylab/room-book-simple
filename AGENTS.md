# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router, UI, and route handlers (`api/`, `components/`, pages like `page.tsx`).
- `lib/`: Core logic (Airtable client, auth, validation, hooks, types).
- `utils/`: Pure helpers (date/slot utilities).
- `__tests__/`: Integration/security tests; libs also have colocated `__tests__/`.
- `public/`: Static assets; `docs/`: reference material; `scripts/`: maintenance tasks (webhooks, analysis).

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server with Turbopack.
- `npm run build`: Production build.
- `npm start`: Run the built app.
- `npm run lint`: ESLint (Next.js + TypeScript rules).
- `npm test` | `npm run test:watch` | `npm run test:coverage`: Jest + Testing Library.
- Webhooks utilities: `npm run webhooks:setup|list|delete` (see `scripts/setup-webhooks.ts`).
- One-off scripts: `npx tsx scripts/analyze-bookings-timezone.ts`.

## Coding Style & Naming Conventions
- TypeScript strict mode enabled; prefer explicit types.
- ESLint rules: no `any`, no unused vars, prefer `const`, no `var`.
- Indentation 2 spaces; Prettier not enforced—match existing style.
- Components: PascalCase (`app/components/RoomCard.tsx`).
- Files: `.ts`/`.tsx`; tests `*.test.ts(x)` or under `__tests__/`.
- Imports: use alias `@/*` (e.g., `import { getRooms } from '@/lib/airtable'`).

## Testing Guidelines
- Framework: Jest 30, `jest-environment-jsdom`, Testing Library (`@testing-library/jest-dom`).
- Setup: `jest.setup.js` sets TZ=UTC and mocks Next.js APIs.
- Coverage: measured from `app/`, `lib/`, `utils/` via `test:coverage`; add meaningful tests with new code.
- Place tests next to code or in `__tests__/`; name with `.test.ts(x)`.

## Commit & Pull Request Guidelines
- Commits: imperative present tense, concise scope (e.g., "feat: add ICS export").
- Before PR: `npm run lint && npm test` must pass.
- PRs: clear description, linked issue, screenshots for UI changes, test updates, and notes on env/config changes.

## Security & Configuration Tips
- Secrets in `.env.local`; use `.env.example` as reference. Never commit real keys.
- Airtable/Slack scopes: follow README; only run webhook scripts with appropriate tokens.
- Avoid committing `.next/` and generated artifacts; respect `next.config.ts` and `tsconfig.json` paths.
