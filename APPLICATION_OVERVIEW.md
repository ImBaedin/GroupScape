# GroupScape Application Overview

## Purpose and Product Goals

GroupScape is an OSRS party coordination app focused on making it easier to form groups quickly and reliably.

Current MVP goals are:

- Let players create and discover free-text parties (name, description, size).
- Support multiple OSRS accounts per user profile.
- Verify account ownership using deterministic hiscores XP-delta challenges.
- Support request/approve join flow managed by party leaders.
- Provide baseline realtime direction via RuneLite party-client integration paths.

In short: reduce friction between "I want to run content" and "I have a ready party."

## Current Feature Scope (MVP Status)

Implemented in code today:

- Auth and user bootstrap (`users.getOrCreate` on login).
- Player account CRUD (add/list/delete).
- Active account selection for party leadership context.
- Headshot upload/storage using Convex file storage.
- Verification challenge lifecycle (start, pending window, verify, cancel).
- Party CRUD around open/closed lifecycle.
- Party join requests, owner review (approve/reject), member leave.
- Party search + aggregate party metrics on home/party pages.
- Profile stats summary fetched from OSRS hiscores and cached.

Still open in `TASKS.md`:

- Full manual QA flow pass (`T1`).
- Additional verification UX polish task (`F4`) marked incomplete, though substantial verification UI already exists in `/profile`.

## System Architecture

### Monorepo layout

- `apps/web`: React 19 + TanStack Router SPA.
- `packages/backend`: Convex backend (queries, mutations, actions, schema, auth routes).
- `packages/runelite-party-client`: TypeScript RuneLite WebSocket/protobuf client.
- `packages/osrs-content`: Legacy/experimental content schema helpers (not central to current free-text party flow).
- `packages/config`: shared config package placeholder.

### Runtime architecture

- Frontend talks to Convex through generated API bindings.
- Convex stores application state (users, accounts, parties, metrics, cached stats).
- Convex `action`s run Node-side logic for external fetches (hiscores, image handling).
- Better Auth runs through Convex HTTP routes and maps identity to `users.tokenIdentifier`.

### Data model (Convex)

Core tables in `packages/backend/convex/schema.ts`:

- `users`: auth identity + linked accounts + active account.
- `playerAccounts`: username, optional headshot storage id, verification state/challenge.
- `playerAccountStats`: cached hiscores JSON + compact summary + freshness timestamp.
- `parties`: owner, members (leader/member role + pending/accepted status), free-text details, searchable text, lifecycle status.
- `partyMetrics`: denormalized counters used by landing pages.

Notable indexes:

- `parties.by_status_and_createdAt`
- `parties.by_ownerId`
- `parties.search_parties` search index on `searchText` (filtered by `status`)

## Main Domain Flows

### 1) Authentication and bootstrap

- Better Auth handles Discord social auth.
- On authenticated web session, `AuthBootstrap` calls `api.users.getOrCreate` once.
- Backend resolves identity via `ctx.auth.getUserIdentity()` and `tokenIdentifier`.

### 2) Account management and verification

- User adds OSRS usernames in profile.
- Optional headshot is uploaded through Node action (`headshots.saveHeadshot`) into Convex storage.
- Verification starts via `verification.start`:
  - fetch hiscores,
  - choose an eligible deterministic task,
  - store challenge and mark status `pending`.
- Verification completes via `verification.verify`:
  - re-fetch hiscores,
  - compare XP delta against expected threshold,
  - mark account `verified` when threshold met.

### 3) Party lifecycle

- Creator opens a party via `parties.create`.
- Leader is inserted as accepted member with role `leader`.
- Other users request join via `parties.requestJoin` with selected account.
- Leader approves/rejects via `parties.reviewRequest`.
- Party can be opened/closed (`parties.updateStatus`) or removed (`parties.remove`).
- Members can leave their own accepted/pending entry (`parties.leave`).

### 4) Search and metrics

- `searchText` is normalized from party name/description.
- Home and parties pages use search and aggregate metrics queries.
- `partyMetrics` is updated incrementally during major party/member state changes.

## Frontend Architecture

Routing is file-based with TanStack Router (`apps/web/src/routes`).

Primary routes:

- `/`: landing page, quick search, world metrics.
- `/parties`: party board + create party form.
- `/party/$partyId`: party detail, join request, owner moderation/actions.
- `/profile`: linked accounts, verification controls, stats refresh, headshot.
- `/party-tracker`: RuneLite tracker test harness.
- `/auth`: sign in/up flow.

Frontend patterns used today:

- `useQuery` for reactive Convex query data.
- `useMutation` for state-changing Convex mutations.
- `useAction` for Node-side Convex actions (hiscores fetch, verification, uploads).
- Shadcn-style component primitives + custom OSRS-themed styling in `index.css`.

## Tech Stack

- Runtime/package manager: Bun workspaces (`bun@1.3.3`)
- Frontend: React 19, TanStack Router, Vite 6, TypeScript
- Backend: Convex (queries/mutations/actions, realtime subscriptions, storage)
- Auth: Better Auth + `@convex-dev/better-auth`
- UI: Tailwind CSS v4, shadcn-style component setup, lucide icons, sonner toasts
- Validation/types: Convex validators + Zod in selected packages
- Tooling: Biome for lint/format, TypeScript strict mode

## Environment and Setup Notes

Minimum local setup:

1. Install dependencies: `bun install`
2. Configure Convex: `bun run dev:setup`
3. Add web env values in `apps/web/.env`:
   - `VITE_CONVEX_URL`
   - `VITE_CONVEX_SITE_URL`
4. Run app: `bun run dev`

Important repo-specific note from `AGENTS.md`:

- Run TypeScript checks after code changes (`tsc --noEmit` for affected package).
- Avoid `convex codegen` in this repo (known to fail due to blocked network/Sentry behavior).

## Conventions for New Feature Development

### Where to add backend code

- Schema/table/index changes: `packages/backend/convex/schema.ts`
- Auth/user identity behavior: `packages/backend/convex/auth.ts`, `packages/backend/convex/lib/auth.ts`, `packages/backend/convex/users.ts`
- Party behavior: `packages/backend/convex/parties.ts`
- Account/verification behavior: `packages/backend/convex/playerAccounts.ts`, `packages/backend/convex/verification.ts`, `packages/backend/convex/verificationActions.ts`
- External IO / fetch-heavy logic: Convex `action` modules (`"use node"`)

### Where to add frontend code

- New screens/routes: `apps/web/src/routes`
- Shared UI/components: `apps/web/src/components`
- Feature styling and theme classes: `apps/web/src/index.css`

### Decision rules that fit this codebase

- Keep DB access and authorization checks in Convex functions, not in the client.
- Use `query` for reactive reads, `mutation` for transactional writes, `action` for external network/CPU-heavy work.
- Prefer updating denormalized counters (`partyMetrics`) close to the mutation that changes source state.
- Keep search text normalization centralized to avoid drift in indexed data.
- When adding fields that impact existing parties, provide a backfill path (internal mutation pattern already exists).

## Known Risks / Improvement Opportunities

- `parties.requestJoin` currently allows unverified account requests (UI deprioritizes but backend does not enforce strict verified-only gate).
- Verification window is currently 5 minutes in code (`verification.ts`), while planning notes previously referenced 15 minutes.
- Metrics integrity depends on mutation-time deltas; periodic reconciliation/backfill should remain available.
- `packages/osrs-content` appears partially legacy and may need cleanup or clear ownership.

## Suggested First Reads for New Contributors

- `/README.md`
- `/TASKS.md`
- `/packages/backend/convex/schema.ts`
- `/packages/backend/convex/parties.ts`
- `/packages/backend/convex/playerAccounts.ts`
- `/packages/backend/convex/verification.ts`
- `/apps/web/src/routes/index.tsx`
- `/apps/web/src/routes/parties.tsx`
- `/apps/web/src/routes/party.$partyId.tsx`
- `/apps/web/src/routes/profile.tsx`
