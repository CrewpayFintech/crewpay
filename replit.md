# CrewPay

CrewPay is a crew management and payout app — team leads post tasks and manage payouts; crew members claim work, submit proof, and get paid.

## Important — Monorepo Structure

This is a **pnpm monorepo**. The production Expo web app lives in `artifacts/crewpay/`. Do **not** move it to replace the root workspace. Preserve `vercel.json` at the project root.

- **Root `vercel.json`** — configures Vercel deployment: builds the Expo web export from `artifacts/crewpay/` and serves it from `artifacts/crewpay/dist/`. Do not delete or overwrite this file.
- **`artifacts/crewpay/`** — the Expo (React Native + Web) app. This is the production app deployed to crewpay.online via Vercel.
- **`artifacts/api-server/`** — shared Express API server (health routes; not heavily used yet).
- **`artifacts/mockup-sandbox/`** — Vite design sandbox for UI mockups.
- **`lib/`** — shared TypeScript packages (api-spec, api-client-react, api-zod, db).

## Run & Operate

- `pnpm --filter @workspace/crewpay run dev` — run the Expo app in dev mode (Metro bundler, Expo Go)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: Expo (React Native + Web), expo-router, Supabase JS client
- **Backend**: Supabase (auth, database, RPC functions) — all data logic runs via Supabase RPCs
- **API**: Express 5 (minimal; Supabase handles most backend)
- **Deployment**: Vercel (crewpay.online) — `expo export --platform web` → static files

## Where Things Live

- `artifacts/crewpay/App.tsx` — the entire app UI (single large component file, ~20k lines)
- `artifacts/crewpay/lib/` — Supabase service modules (auth, team, invite, payout, etc.)
- `artifacts/crewpay/constants/` — theme, onboarding slides, team/task options
- `artifacts/crewpay/utils/app-helpers.ts` — invite URL parsing, formatting helpers
- `artifacts/crewpay/app/` — expo-router entry points (all delegate to App.tsx)
- `artifacts/crewpay/assets/` — images used in onboarding slides and home screen

## Required Secrets

- `EXPO_PUBLIC_SUPABASE_URL` — your Supabase project URL (e.g. `https://xxx.supabase.co`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the **full** Supabase anon JWT (three dot-separated parts: `eyJ...header.eyJ...payload.signature`)
- `EXPO_PUBLIC_AUTH_REDIRECT_URL` — OAuth redirect URL (for web this auto-detects from `window.location.origin`; can leave blank or set to `https://crewpay.online/auth/callback` for production)

## Join Team Flow

Invite links use the format: `https://crewpay.online/?invite=TOKEN&team=TEAM_NAME`

When a user opens this URL:
1. The app reads `?invite=` from `window.location.href` on startup (via `extractInviteDetails`)
2. If not signed in → redirects to email auth, stores invite in AsyncStorage
3. If signed in → shows JoinTeamScreen with the token pre-filled
4. User taps Join → calls `joinTeamWithInvite(token)` → Supabase RPC `join_team_with_invite`

Invite links are generated in-app via `createTeamInvite()` → Supabase RPC `create_team_invite`.

## Architecture Decisions

- All app state lives in a single `App()` component in `App.tsx`. This is intentional — the app was built this way and refactoring to smaller components is out of scope.
- Supabase RPCs handle all business logic (join team, verify passcode, payout queue). The Express api-server is minimal.
- The Expo `origin` in `app.json` is set to `https://crewpay.online` so expo-router generates correct deep links for production.
- Auth uses Supabase magic-link OTP (email code) + optional Google OAuth.

## Gotchas

- **Do not run `pnpm dev` at the workspace root** — it has no dev script. Run per-artifact: `pnpm --filter @workspace/crewpay run dev`.
- **Supabase anon key must be the full JWT** — three dot-separated segments. If the key starts with `.eyJ`, it is missing the header segment and auth will silently fail.
- **`EXPO_PUBLIC_AUTH_REDIRECT_URL`** — for web, this auto-detects from `window.location.origin/auth/callback`, so it is not strictly required for development.
- The `.migration-backup/` artifact workflows are expected to fail — they have no `node_modules` and should be ignored.
- The root `vercel.json` configures the production build. It must stay at the project root.

## User Preferences

- Preserve root `vercel.json` at all times — do not delete or overwrite it.
- This is a pnpm monorepo. The Expo web app is in `artifacts/crewpay/` — do not restructure this.
- The production domain is crewpay.online (Vercel deployment).
