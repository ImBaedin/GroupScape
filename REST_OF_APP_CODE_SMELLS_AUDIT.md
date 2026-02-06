# Rest of App Code Smells Audit

## Scope
- Audited everything under `apps/web/src` except `apps/web/src/routes/party.$partyId.tsx` (already audited separately).
- Focused on major React + Convex smells, with emphasis on `useEffect` overuse and reactive data integrity.

## Findings

### 1) Reactive data broken by local mirror of server state
- Severity: High
- Location: `apps/web/src/routes/profile.tsx:206`, `apps/web/src/routes/profile.tsx:300`, `apps/web/src/routes/profile.tsx:362`
- Smell:
  - `accountStats` is stored in local component state and populated via `useEffect` + `useAction` (`fetchAccountStats`).
  - Refresh path (`handleRefreshStats`) manually re-fetches and writes the same local state.
- Why this is a problem:
  - This bypasses Convex query subscriptions, so updates can go stale unless manually refreshed.
  - Creates dual sources of truth (`accounts` from `useQuery` vs `accountStats` from local state).
  - High chance of drift after account add/remove, tab focus changes, or backend updates.
- Relevant skill:
  - `convex-best-practices` (Queries are reactive; avoid request-style thinking for subscribable data)
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-fix notes:
  - Move stats data flow to a reactive query (or a dedicated hook that exposes query-backed state) and remove effect-driven mirroring.

### 2) Manual async effect can race and overwrite with stale response
- Severity: High
- Location: `apps/web/src/routes/profile.tsx:300`
- Smell:
  - Effect runs async fetch and writes state with a `cancelled` flag, but still depends on manual race management.
- Why this is a problem:
  - If auth/session flips quickly, stale responses can still win edge races.
  - Adds complexity that disappears when using reactive queries.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-move-effect-to-event`, `rerender-derived-state-no-effect`)
  - `convex-best-practices`
- Future-fix notes:
  - Replace effect-managed loading with query-backed subscription or abortable request abstraction.

### 3) Effect-driven fetch in `HeadshotSelector` is race-prone and not reset-safe
- Severity: High
- Location: `apps/web/src/components/headshot-selector.tsx:365`, `apps/web/src/components/headshot-selector.tsx:372`
- Smell:
  - `getModel({ username })` in `useEffect` updates `modelData`, `petModelData`, `loading`, `error` without request identity/abort handling.
- Why this is a problem:
  - Rapid username changes can show stale model data from an earlier request.
  - `loading`/`error` are not reset at effect start, so UI state can become inconsistent across prop changes.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-move-effect-to-event`, `rerender-dependencies`)
- Future-fix notes:
  - Add request sequencing/abort control and deterministic state resets per username transition.

### 4) Derived state synced with effect (URL search -> local state)
- Severity: Medium
- Location: `apps/web/src/routes/parties.tsx:30`, `apps/web/src/routes/parties.tsx:53`
- Smell:
  - `searchValue` is mirrored from route search via `useEffect(() => setSearchValue(search), [search])`.
- Why this is a problem:
  - Duplicates state and introduces overwrite risk (local edits can be clobbered by external route updates).
  - Extra render cycle for value synchronization.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-fix notes:
  - Prefer a single source of truth pattern for query param + input draft state.

### 5) Redirect implemented as component effect instead of route-level guard
- Severity: Medium
- Location: `apps/web/src/routes/index.tsx:43`
- Smell:
  - Auth redirect is done in `useEffect` after render.
- Why this is a problem:
  - Can cause brief blank/flash (`return null`) before navigation.
  - Cross-cutting navigation logic is harder to reason about in render components.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-move-effect-to-event` in spirit: keep effects for true external sync, not control flow)
- Future-fix notes:
  - Move auth gating/redirect into router `beforeLoad`/route guard.

### 6) N+1 reactive subscriptions for per-account headshots (profile page)
- Severity: Medium
- Location: `apps/web/src/routes/profile.tsx:131`, `apps/web/src/routes/profile.tsx:138`, `apps/web/src/routes/profile.tsx:778`
- Smell:
  - `AccountHeadshot` calls `useQuery(api.playerAccounts.getHeadshotUrl, { accountId })` per row.
- Why this is a problem:
  - One subscription per account scales poorly and increases render churn/network pressure.
  - More moving pieces to keep consistent with account list updates.
- Relevant skill:
  - `convex-best-practices` (query patterns and API shape for efficient reactive reads)
  - `vercel-react-best-practices` (`client-swr-dedup` conceptually: dedupe repeated client reads)
- Future-fix notes:
  - Prefer a batched query that returns all needed headshot URLs with account list.

### 7) N+1 reactive subscriptions for per-account headshots (profile badge menu)
- Severity: Medium
- Location: `apps/web/src/components/profile-badge.tsx:28`, `apps/web/src/components/profile-badge.tsx:43`, `apps/web/src/components/profile-badge.tsx:179`
- Smell:
  - `AccountRow` creates one `useQuery` per menu item for headshot URL.
- Why this is a problem:
  - Same subscription fanout issue as profile page.
  - Dropdown open/render cost grows with account count.
- Relevant skill:
  - `convex-best-practices`
  - `vercel-react-best-practices`
- Future-fix notes:
  - Batch headshot URL data with account list query used by the badge.

### 8) Auth-gated queries use `undefined` instead of explicit skip
- Severity: Medium
- Location: `apps/web/src/routes/profile.tsx:162`, `apps/web/src/routes/profile.tsx:170`, `apps/web/src/components/profile-badge.tsx:79`, `apps/web/src/components/profile-badge.tsx:83`
- Smell:
  - Some auth-gated `useQuery` calls pass `undefined` when unauthenticated, while others use `"skip"`.
- Why this is a problem:
  - Inconsistent semantics make behavior harder to reason about and can accidentally fire queries when auth is false.
  - Increases risk of unauthorized query errors and noisy retries.
- Relevant skill:
  - `convex-best-practices`
- Future-fix notes:
  - Standardize auth-gated queries to explicit skip pattern.

### 9) 3D geometry lifecycle managed by effect without explicit disposal
- Severity: Medium
- Location: `apps/web/src/components/headshot-selector.tsx:31`, `apps/web/src/components/headshot-selector.tsx:114`
- Smell:
  - Effects allocate and replace `BufferGeometry` in state; old geometries are not explicitly disposed on replacement/unmount.
- Why this is a problem:
  - Potential GPU memory leaks in prolonged sessions or repeated headshot edits.
  - Hidden perf degradation over time.
- Relevant skill:
  - `vercel-react-best-practices` (rendering/perf discipline; avoid long-lived leaked resources)
- Future-fix notes:
  - Dispose previous geometry in cleanup paths when replacing/unmounting.

### 10) Imperative mesh position syncing duplicates declarative prop
- Severity: Low
- Location: `apps/web/src/components/headshot-selector.tsx:202`, `apps/web/src/components/headshot-selector.tsx:216`
- Smell:
  - `PetModel` passes `position={position}` and also runs effect to imperatively set `meshRef.current.position`.
- Why this is a problem:
  - Mixed imperative/declarative control can cause subtle jitter and harder-to-trace render behavior.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect` mindset)
- Future-fix notes:
  - Keep one source of truth for transform updates.

## Notes for Future Fix Pass
- Prioritize findings 1-4 first; they have the biggest correctness/reactivity impact.
- Keep Convex data query-driven wherever possible; avoid effect/state mirrors unless there is no reactive source.
- If local state is required, define strict ownership boundaries (server state vs transient UI state).
