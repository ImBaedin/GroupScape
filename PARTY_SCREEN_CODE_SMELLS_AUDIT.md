# Party Screen Code Smells Audit

Scope: `apps/web` with primary focus on `apps/web/src/routes/party.$partyId.tsx`, plus related React/Convex patterns that create stale or non-reactive state.

## 1. Non-reactive Convex query wrapped in `useEffect` + local state mirror (Critical)
- Location: `apps/web/src/routes/party.$partyId.tsx:113`
- Smell:
  - `convex.query(api.parties.get, ...)` is called inside `useEffect`.
  - Response is copied into local `partyData` state via `setPartyData`.
- Why this is a problem:
  - This converts a reactive subscription into a one-time request.
  - Party details will go stale unless a full rerender + effect rerun happens.
  - It duplicates loading/error state that `useQuery` already models.
- Relevant skill:
  - `convex-best-practices` (Queries are reactive)
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Replace this with `useQuery(api.parties.get, isAuthenticated ? { partyId } : "skip")` and remove `partyData` fetch effect state machine.

## 2. Query result copied into editable draft state on every reactive update (High)
- Location: `apps/web/src/routes/party.$partyId.tsx:144`
- Smell:
  - `useEffect` copies `partyData.name` and `partyData.description` into `draftName`/`draftDescription`.
- Why this is a problem:
  - If party data updates while editing, local input can be clobbered.
  - It creates derived state synchronization logic that is easy to break.
  - This is exactly the class of `useEffect` synchronization bug React guidance warns about.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`, `rerender-move-effect-to-event`)
- Future-self note:
  - Initialize drafts when entering edit mode, not from a passive syncing effect.

## 3. Selection state initialized from query data via effect and then decoupled (Medium)
- Location: `apps/web/src/routes/party.$partyId.tsx:104`
- Smell:
  - `selectedAccountId` is lazily set in `useEffect` from `accounts` + `appUser.activePlayerAccountId`.
- Why this is a problem:
  - The selected account can drift from authoritative query changes after initialization.
  - Mixed “controlled by server state” and “controlled by local state” logic increases edge cases.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Prefer explicit user-driven selection state plus deterministic fallback computed during render.

## 4. N+1 reactive query pattern for roster/pending badges (High)
- Location:
  - `apps/web/src/routes/party.$partyId.tsx:1098`
  - `apps/web/src/routes/party.$partyId.tsx:1132`
- Smell:
  - `useQuery(api.playerAccounts.getMemberProfile, ...)` is invoked per row component (`RosterMemberCard`, `PendingVerificationBadge`).
- Why this is a problem:
  - Subscription count scales with member count.
  - Duplicated per-member subscriptions for accepted + pending sections increase fanout and render churn.
  - Harder to reason about loading waterfalls in larger parties.
- Relevant skill:
  - `convex-best-practices` (query design and API surface)
  - `vercel-react-best-practices` (waterfall/rerender pressure awareness)
- Future-self note:
  - Consolidate into a single party-members profile query keyed by party/account ids.

## 5. Manual type shadowing for Convex documents (Medium)
- Location:
  - `apps/web/src/routes/party.$partyId.tsx:40`
  - `apps/web/src/routes/party.$partyId.tsx:47`
- Smell:
  - Local `PartyMember`/`PartyData` types redefine server document shape.
- Why this is a problem:
  - Type drift risk from backend schema evolution.
  - Weakens end-to-end type guarantees Convex already provides.
- Relevant skill:
  - `convex-best-practices` (TypeScript everywhere, generated types)
- Future-self note:
  - Prefer generated `Doc`/query return types from Convex.

## 6. Monolithic route component with mixed concerns (High)
- Location: `apps/web/src/routes/party.$partyId.tsx` (entire file, ~1.2k lines)
- Smell:
  - Data fetching, state transitions, mutations, formatting, and large UI tree are all in one component.
- Why this is a problem:
  - Hard to test and reason about reactivity invariants.
  - Small changes can accidentally perturb unrelated behavior.
  - Encourages “patch-on-effect” fixes over clear composition boundaries.
- Relevant skill:
  - `vercel-react-best-practices` (rerender optimization through component boundaries)
- Future-self note:
  - Split into hooks + focused presentational components (`usePartyDetails`, `PartyHeader`, `PartyRoster`, `PartyJoinPanel`, etc.).

## 7. Action result stored as long-lived local source-of-truth (High)
- Location: `apps/web/src/routes/profile.tsx:300`
- Smell:
  - `fetchAccountStats` action is called in `useEffect`; result is stored in `accountStats` state.
  - Refresh path also manually refetches and replaces local state (`handleRefreshStats`).
- Why this is a problem:
  - Non-reactive data cache in component state can drift from backend truth.
  - Duplicates loading/error/cache orchestration in client.
  - Same stale-data class as the party screen issue.
- Relevant skill:
  - `convex-best-practices` (reactive query preference)
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Move display data to a query where feasible; keep actions for imperative side effects only.

## 8. Route/search state mirrored via effect (Low-Medium)
- Location: `apps/web/src/routes/parties.tsx:53`
- Smell:
  - `search` route param is copied into local `searchValue` via `useEffect`.
- Why this is a problem:
  - Creates dual sources of truth and synchronization logic.
  - Can be avoided with a controlled input strategy tied directly to router state.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Keep either route state authoritative or local draft authoritative, but not both with effect sync.

## 9. Async effect without cancellation in model fetching component (Low-Medium)
- Location: `apps/web/src/components/headshot-selector.tsx:372`
- Smell:
  - `getModel({ username })` promise in `useEffect` sets state after resolve/reject without cancellation guard.
- Why this is a problem:
  - Potential late-set after unmount or after username switch race.
  - Makes loading/error states race-prone under rapid prop changes.
- Relevant skill:
  - `vercel-react-best-practices` (effect correctness and rerender stability)
- Future-self note:
  - Add cancellation guard (`ignore` flag/AbortController pattern) or move request lifecycle into a query hook.

## 10. Redirect side effect in render flow route (Low)
- Location: `apps/web/src/routes/index.tsx:43`
- Smell:
  - Auth-based redirect is performed via `useEffect` + `navigate`.
- Why this is a problem:
  - Produces transient render pass (`return null`) before navigation.
  - Route-level redirect loaders/guards are typically more deterministic.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-move-effect-to-event` principle applied to avoid unnecessary effects)
- Future-self note:
  - Use TanStack Router route guards/loaders for auth redirects.

---

## Priority Order For Fixing
1. Item 1 (`party.$partyId`: replace effect-driven `convex.query` with reactive `useQuery`)
2. Item 2 (`party.$partyId`: remove draft synchronization effect)
3. Item 4 (`party.$partyId`: collapse N+1 member profile queries)
4. Item 7 (`profile`: remove effect-driven action cache as long-lived source of truth)
5. Item 6 (decompose monolithic route to make reactivity fixes safe)
