# Exhaustive Code Quality and Performance Audit

## Scope
- Repository: `GroupScape`
- Date: 2026-02-06
- Focus requested: composability problems, overly complex architecture, excessive use of React hooks, and high-impact performance risks.
- Skills applied:
  - `vercel-composition-patterns`
  - `vercel-react-best-practices`
  - `convex-best-practices`

## Hotspot Snapshot
- `apps/web/src/routes/profile.tsx` (1098 LOC, ~21 hook calls)
- `apps/web/src/components/headshot-selector.tsx` (470 LOC, ~27 hook calls)
- `apps/web/src/routes/party-tracker.tsx` (434 LOC, ~10 hook calls)
- `apps/web/src/routes/parties.tsx` (368 LOC, ~9 hook calls)
- `packages/backend/convex/parties.ts` (1028 LOC)

## Findings (High -> Medium)

### 1. [High] `ProfileRoute` is a god component with mixed concerns [Completed]
- Where: `apps/web/src/routes/profile.tsx:159`
- Why this is a problem:
  - One component owns auth gating, data fetching, verification workflows, stats orchestration, headshot capture, and 500+ lines of UI rendering.
  - This makes changes risky and testing painful, and it blocks clean composition boundaries.
- Relevant skill:
  - `vercel-composition-patterns` (`architecture-compound-components`, `state-decouple-implementation`)
- Future-self note:
  - Split into feature slices: data orchestrator hook + presentational sections (`AccountList`, `VerificationPanel`, `StatsPanel`, `HeadshotPanel`).

### 2. [High] Excessive local state + hook density in one route [Completed]
- Where: `apps/web/src/routes/profile.tsx:186-232`, `apps/web/src/routes/profile.tsx:246-328`
- Why this is a problem:
  - Large clusters of `useState`, `useMemo`, `useEffect` increase cognitive load and create subtle interaction bugs.
  - Local state ownership is unclear (UI state vs server-derived state vs transient process state).
- Relevant skill:
  - `vercel-composition-patterns` (`state-lift-state`, `state-context-interface`)
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Centralize related UI state in reducer/context or split by concern-specific hooks.

### 3. [High] Full-profile re-render every second during verification windows [Completed]
- Where: `apps/web/src/routes/profile.tsx:263-298`
- Why this is a problem:
  - `nowMs` ticks each second and invalidates the entire profile route render tree.
  - Cost scales with account count and with heavy subtrees.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state`, `rerender-memo`)
- Future-self note:
  - Move ticking to a narrow timer component/hook scoped to countdown UI only.

### 4. [High] Local mirror of server stats breaks reactive model [Completed]
- Where: `apps/web/src/routes/profile.tsx:206-232`, `apps/web/src/routes/profile.tsx:300-328`
- Why this is a problem:
  - `accountStats` is manually fetched into local state via action/effect instead of reactive query subscription.
  - Creates stale-data windows and double source-of-truth behavior.
- Relevant skill:
  - `convex-best-practices` ("Queries are reactive")
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Convert to query-driven stats source and remove mirror effect/state.

### 5. [High] Refreshing one account triggers broader expensive fetches [Completed]
- Where: `apps/web/src/routes/profile.tsx:362-367`, `packages/backend/convex/playerAccountStatsActions.ts:88-125`
- Why this is a problem:
  - UI refresh of one account calls backend refresh, then re-runs `listForUser`; backend iterates stale accounts and may refresh many sequentially.
  - Latency and backend load can spike unexpectedly.
- Relevant skill:
  - `convex-best-practices` (query/action boundaries, efficient patterns)
- Future-self note:
  - Return/patch only the refreshed account summary for targeted optimistic update.

### 6. [High] `HeadshotSelector` performs per-frame React state updates while dragging
- Where: `apps/web/src/components/headshot-selector.tsx:176-200`, `apps/web/src/components/headshot-selector.tsx:251-353`
- Why this is a problem:
  - `onPositionChange` calls `setPetPosition` from `useFrame`, potentially 60 updates/sec.
  - Causes unnecessary React reconciliation while Three.js can handle transient motion imperatively.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-use-ref-transient-values`, `rendering-performance`)
- Future-self note:
  - Keep drag motion in refs; commit state only on drag end.

### 7. [High] `HeadshotSelector` is a monolith with duplicated model-loading logic
- Where: `apps/web/src/components/headshot-selector.tsx:27-236`, `apps/web/src/components/headshot-selector.tsx:360-470`
- Why this is a problem:
  - `Model` and `PetModel` duplicate decode/load/transform pipelines.
  - Hard to change safely; bug fixes must be mirrored in multiple blocks.
- Relevant skill:
  - `vercel-composition-patterns` (`architecture-compound-components`, `patterns-explicit-variants`)
- Future-self note:
  - Extract shared `usePlyGeometry` hook + composed model variants.

### 8. [High] Heavy 3D feature is statically imported into profile route [Completed]
- Where: `apps/web/src/routes/profile.tsx:22`, `apps/web/src/routes/profile.tsx:872-877`
- Why this is a problem:
  - `HeadshotSelector` (three/drei/fiber stack) is bundled with profile route even if user never opens capture UI.
  - Increases JS payload and parse/execute time.
- Relevant skill:
  - `vercel-react-best-practices` (`bundle-dynamic-imports`, `bundle-conditional`)
- Future-self note:
  - Lazy-load headshot module only when panel is opened.

### 9. [High] Route tree is statically assembled, including heavy/non-core routes
- Where: `apps/web/src/main.tsx:7-13`, `apps/web/src/routeTree.gen.ts:11-18`
- Why this is a problem:
  - Generated route tree imports all routes eagerly.
  - Includes heavy `party-tracker` route payload in startup path.
- Relevant skill:
  - `vercel-react-best-practices` (`bundle-dynamic-imports`)
- Future-self note:
  - Introduce lazy route components for heavy routes.

### 10. [High] `party-tracker` route is production-exposed test harness with expensive rendering
- Where: `apps/web/src/routes/party-tracker.tsx:17-19`, `apps/web/src/components/header.tsx:9-12`
- Why this is a problem:
  - Debug/test UI is linked in primary nav.
  - High-frequency updates render large cards with many item images and no memoization/virtualization.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-memo`, `rendering-content-visibility`)
  - `vercel-composition-patterns` (component architecture boundaries)
- Future-self note:
  - Hide behind dev flag or split into admin/debug build surface.

### 11. [High] Context provider value is recreated every render (fan-out re-renders)
- Where: `apps/web/src/features/party-detail/components/PartyDetailPage.tsx:163-172`
- Why this is a problem:
  - New object identity on each render causes all context consumers to re-render.
  - Reduces ability to optimize independently.
- Relevant skill:
  - `vercel-composition-patterns` (`state-decouple-implementation`, provider interface discipline)
- Future-self note:
  - Memoize provider value or split context by concern.

### 12. [High] `parties.ts` backend domain is overly monolithic
- Where: `packages/backend/convex/parties.ts:1-1028`
- Why this is a problem:
  - Business mutations, query logic, audits, and one-off backfills are mixed into a single file.
  - Large blast radius and poor reviewability for future changes.
- Relevant skill:
  - `convex-best-practices` (function organization by domain responsibility)
- Future-self note:
  - Split into `parties.queries.ts`, `parties.mutations.ts`, `parties.maintenance.ts`.

### 13. [High] Sequential N+1 membership lookups on hot auth paths
- Where: `packages/backend/convex/lib/partyMembership.ts:47-75`
- Why this is a problem:
  - `getUserPartyMemberships` fetches membership rows, then `ctx.db.get` per row sequentially.
  - This function is used for lock checks in frequent actions/mutations.
- Relevant skill:
  - `convex-best-practices` (query efficiency and index-first patterns)
- Future-self note:
  - Use bounded parallel reads and/or denormalize party status/name into membership rows.

### 14. [High] `listForUser` stats action refreshes stale accounts sequentially
- Where: `packages/backend/convex/playerAccountStatsActions.ts:102-122`
- Why this is a problem:
  - Per-account external fetches are serialized, increasing wall-clock latency for users with many accounts.
  - Higher timeout risk under slow upstream hiscores responses.
- Relevant skill:
  - `convex-best-practices`
- Future-self note:
  - Use controlled parallelism (batch + cap) and return incremental/partial results.

### 15. [Medium] N+1 headshot subscriptions on profile account list [Completed]
- Where: `apps/web/src/routes/profile.tsx:131-140`, `apps/web/src/routes/profile.tsx:778-781`
- Why this is a problem:
  - One query subscription per row scales poorly and increases reactive churn.
- Relevant skill:
  - `convex-best-practices`
  - `vercel-react-best-practices` (`client-swr-dedup` principle)
- Future-self note:
  - Batch headshot URLs with account list payload.

### 16. [Medium] N+1 headshot subscriptions in profile dropdown menu
- Where: `apps/web/src/components/profile-badge.tsx:43-45`, `apps/web/src/components/profile-badge.tsx:179-187`
- Why this is a problem:
  - Same fan-out issue as profile route; extra cost when menu mounts.
- Relevant skill:
  - `convex-best-practices`
- Future-self note:
  - Reuse batched headshot map from parent query.

### 17. [Medium] Duplicate account-switching business logic in multiple components [Completed]
- Where: `apps/web/src/routes/profile.tsx:400-419`, `apps/web/src/components/profile-badge.tsx:130-149`
- Why this is a problem:
  - Two implementations for lock-check + mutation + toast flow increase drift risk.
- Relevant skill:
  - `vercel-composition-patterns` (`state-context-interface`, reusable composition)
- Future-self note:
  - Extract `useActiveAccountSwitcher` shared hook.

### 18. [Medium] `PartyDetailSideColumn` mixes owner and member apps in one component
- Where: `apps/web/src/features/party-detail/components/PartyDetailSideColumn.tsx:13-354`
- Why this is a problem:
  - Contains two distinct products in one component (leader controls + member request flow), each with different state machines.
- Relevant skill:
  - `vercel-composition-patterns` (`architecture-compound-components`)
- Future-self note:
  - Split into `LeaderPanel` and `JoinPanel` with a small coordinator wrapper.

### 19. [Medium] Derived URL state mirrored through effect
- Where: `apps/web/src/routes/parties.tsx:30`, `apps/web/src/routes/parties.tsx:53-55`
- Why this is a problem:
  - `searchValue` sync effect duplicates route state and can clobber local edits.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-derived-state-no-effect`)
- Future-self note:
  - Move to single source-of-truth route param or explicit draft state model.

### 20. [Medium] Auth redirect done in render effect rather than route guard
- Where: `apps/web/src/routes/index.tsx:43-46`
- Why this is a problem:
  - Navigation control flow is hidden inside component effect and can flash empty UI.
- Relevant skill:
  - `vercel-react-best-practices` (`rerender-move-effect-to-event` / avoid control-flow effects)
- Future-self note:
  - Shift redirect into route `beforeLoad`/guard layer.

### 21. [Medium] Home page search triggers reactive query on every keystroke
- Where: `apps/web/src/routes/index.tsx:33-37`, `apps/web/src/routes/index.tsx:139-144`
- Why this is a problem:
  - No debounce means frequent query churn while typing.
- Relevant skill:
  - `vercel-react-best-practices` (`client-side data fetching discipline`)
- Future-self note:
  - Add debounced input value and minimum interval.

### 22. [Medium] SPA navigation bypassed with raw anchors in key flows [Completed]
- Where: `apps/web/src/routes/index.tsx:92-97`, `apps/web/src/routes/index.tsx:113-121`
- Why this is a problem:
  - Full document navigations lose in-app state and can hurt perceived performance.
- Relevant skill:
  - `vercel-react-best-practices` (routing/perceived performance)
- Future-self note:
  - Use router `Link` for internal paths.

### 23. [Medium] Dead/parallel UI systems increase maintenance surface
- Where:
  - `apps/web/src/components/osrs-ui/*`
  - `apps/web/src/components/user-menu.tsx`
  - `apps/web/src/components/content/search/*.tsx`
- Why this is a problem:
  - Unused component trees and alternate UI stacks create confusion and stale-code risk.
  - Increases refactor burden and dependency surface area.
- Relevant skill:
  - `vercel-composition-patterns` (clear component architecture boundaries)
- Future-self note:
  - Remove dead surfaces or explicitly gate/archive them.

### 24. [Medium] `HeadshotSelector` resource lifecycle is brittle
- Where: `apps/web/src/components/headshot-selector.tsx:31-76`, `apps/web/src/components/headshot-selector.tsx:114-161`, `apps/web/src/components/headshot-selector.tsx:372-383`, `apps/web/src/components/headshot-selector.tsx:390-397`, `apps/web/src/components/headshot-selector.tsx:428`
- Why this is a problem:
  - No cancellation strategy for in-flight model requests on username change.
  - No explicit geometry disposal when replaced/unmounted.
  - `setTimeout` capture timing is heuristic.
  - `preserveDrawingBuffer: true` is permanently enabled, which can degrade render performance.
- Relevant skill:
  - `vercel-react-best-practices` (`rendering-performance`, `rerender-dependencies`)
- Future-self note:
  - Add abort/request-id guards, cleanup disposal, and lazy-enable capture buffer only when needed.

### 25. [Medium] Query gating is inconsistent (`"skip"` vs `undefined`)
- Where: `apps/web/src/routes/profile.tsx:162-173`, `apps/web/src/components/profile-badge.tsx:79-90`
- Why this is a problem:
  - Inconsistent patterns increase accidental query execution risk and cognitive load.
- Relevant skill:
  - `convex-best-practices`
- Future-self note:
  - Normalize auth-gated queries to explicit `"skip"` strategy.

### 26. [Medium] Obvious stale/unreferenced symbols indicate drift in `profile.tsx`
- Where: `apps/web/src/routes/profile.tsx:7-8`, `apps/web/src/routes/profile.tsx:243-245`
- Why this is a problem:
  - Unused imports (`Check`, `ChevronDown`) and unused derived variable (`activeAccount`) signal leftover logic and make the file harder to trust.
- Relevant skill:
  - `vercel-composition-patterns` (clean architecture boundaries)
- Future-self note:
  - Remove dead symbols while splitting file by responsibility.

## Suggested Refactor Order (for future implementation pass)
1. Split and stabilize `profile.tsx` + stats/headshot data flow.
2. Refactor `headshot-selector.tsx` into composable hooks/components and remove per-frame state churn.
3. Isolate or lazy-load `party-tracker` route and adopt route-level code splitting.
4. Break down `PartyDetailSideColumn` and memoize context provider value.
5. Split backend `parties.ts` and optimize membership/stats action hot paths.
