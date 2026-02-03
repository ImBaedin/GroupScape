# GroupScape MVP Tasks (Expanded)

Goal: Implement the simplified MVP with free-text parties, multi-account profiles, predictable XP-delta verification, and request + approve join flow. Each task is scoped to be executable in isolation, with explicit context and info needed.

Task format used below:
Task ID: short code
Skills: skills to invoke
Summary: one-line goal
Primary files: key files to read/write
Dependencies: must be done first (if any)
Info needed: questions or inputs to confirm before coding
Steps: implementation steps (minimal)
Acceptance: how to know the task is done

**Backend: Schema + Core Data**

- [x] Task B1: Schema alignment for parties and verification
Skills: $convex-schema-validator, $convex-best-practices
Summary: Update Convex schema to match simplified parties and account verification.
Primary files: `packages/backend/convex/schema.ts`
Dependencies: none
Info needed: party status values (default: open/closed), verification status values (default: unverified/pending/verified), min/max party size (default: 2–254).
Steps:
1. Update `parties` table to include `name`, `description`, `partySizeLimit`, `members`, `createdAt`, `updatedAt`, `status`.
2. Update `playerAccounts` table to include `verificationStatus`, `verificationChallenge`, `lastVerifiedAt`.
3. Ensure `members` includes `memberId`, `playerAccountId`, and `status` (pending/accepted).
Acceptance:
1. Schema matches the data used by new party and verification functions.
2. No schema fields remain for structured content or filters.

- [x] Task B2: Add indexes for parties and account lookups
Skills: $convex-schema-validator, $convex-best-practices
Summary: Add minimal indexes to support list and owner queries.
Primary files: `packages/backend/convex/schema.ts`
Dependencies: B1
Info needed: expected party list sort order (default: newest first).
Steps:
1. Add index on parties by `status` + `createdAt` (or `createdAt` alone if simple).
2. Add index on parties by `ownerId`.
Acceptance:
1. Party list query can filter by status and sort by created time.

- [x] Task B3: Create `users.getOrCreate`
Skills: $convex-functions, $convex-best-practices
Summary: Ensure a user row exists on login.
Primary files: `packages/backend/convex` (new file or `users.ts`), `packages/backend/convex/schema.ts`
Dependencies: B1
Info needed: whether to store extra user metadata beyond token identifier (default: no).
Steps:
1. Add mutation to read `ctx.auth.getUserIdentity()` and insert user if missing.
2. Return the user record.
Acceptance:
1. Newly authenticated users get a `users` row without manual setup.

**Backend: Player Accounts**

- [x] Task B4: Player account CRUD
Skills: $convex-functions, $convex-best-practices
Summary: Add and list player accounts for a user.
Primary files: `packages/backend/convex` (new file `playerAccounts.ts`), `packages/backend/convex/schema.ts`
Dependencies: B1, B3
Info needed: enforce unique username per user? (default: yes).
Steps:
1. Add mutation `playerAccounts.add({ username })` that creates account and links to user.
2. Add query `playerAccounts.list()` returning accounts for current user.
3. Add mutation `playerAccounts.delete({ accountId })` with ownership checks.
Acceptance:
1. User can add/list/delete accounts safely.

- [ ] Task B5: Headshot storage
Skills: $convex-functions, $convex-file-storage
Summary: Store headshot image data in Convex file storage and save the storage id.
Primary files: `packages/backend/convex` (new file or `playerAccounts.ts`), `packages/backend/convex/schema.ts`
Dependencies: B4
Info needed: expected image size/format from frontend (default: PNG data URL).
Steps:
1. Accept image data (base64 or blob) and store via Convex storage.
2. Update `playerAccounts.accountImageStorageId` with the storage id.
Acceptance:
1. Headshot image is persisted and retrievable via storage id.

**Backend: Verification (Predictable XP Delta)**

- [x] Task B6: Create curated verification action list
Skills: $convex-functions
Summary: Hardcode predictable, deterministic actions with XP thresholds.
Primary files: `packages/backend/convex` (new file `verificationActions.ts` or inside `playerAccounts.ts`)
Dependencies: none
Info needed: final action list with skill, minLevel, expectedXp, and instruction text.
Steps:
1. Define a list of actions (non-combat) with fixed XP outcomes.
2. Include enough actions to cover early-game accounts.
Acceptance:
1. Action list can be filtered by player skill levels.

- [x] Task B7: Start verification
Skills: $convex-functions
Summary: Choose an eligible action and store a verification challenge.
Primary files: `packages/backend/convex/playerAccounts.ts` or `packages/backend/convex/verification.ts`
Dependencies: B4, B6
Info needed: whether to use `action` + internal mutation (default: yes, because external hiscores call).
Steps:
1. Fetch hiscores for username.
2. Filter action list based on minLevel and pick a random action.
3. Store `verificationChallenge` with skill, expectedXp, baselineXp, issuedAt.
4. Return instruction text to the client.
Acceptance:
1. Starting verification sets a challenge and returns clear instructions.

- [x] Task B8: Verify account
Skills: $convex-functions
Summary: Confirm XP delta and mark account verified.
Primary files: `packages/backend/convex/playerAccounts.ts` or `packages/backend/convex/verification.ts`
Dependencies: B7
Info needed: retry window duration (default: 15 minutes) and delta comparison (>= expectedXp).
Steps:
1. Fetch hiscores again.
2. Compute XP delta for challenge skill.
3. If delta >= expectedXp, set `verificationStatus` to verified and store `lastVerifiedAt`.
4. If not, return pending status and allow retries within window.
Acceptance:
1. Verified accounts are correctly flagged when XP delta matches.

- [x] Task B9: Retry window enforcement
Skills: $convex-functions
Summary: Keep same challenge for 15 minutes, allow retries.
Primary files: `packages/backend/convex/playerAccounts.ts` or `packages/backend/convex/verification.ts`
Dependencies: B7, B8
Info needed: whether to allow manual reset (default: no).
Steps:
1. If a pending challenge exists and is within 15 minutes, reuse it.
2. If expired, issue a new challenge.
Acceptance:
1. Users retry within 15 minutes without changing the action.

**Backend: Parties + Join Flow**

- [x] Task B10: Update `parties.create` to free-text
Skills: $convex-functions
Summary: Remove structured fields and accept only name/description/size.
Primary files: `packages/backend/convex/parties.ts`, `packages/backend/convex/schema.ts`
Dependencies: B1, B3
Info needed: default party size if not provided (default: 5).
Steps:
1. Update args to `{ name, description?, partySizeLimit }`.
2. Insert party with `members: []`, `status: open`, and timestamps.
Acceptance:
1. Parties can be created without content selection.

- [ ] Task B11: Party list + detail queries
Skills: $convex-functions
Summary: Add list and detail queries with basic metadata.
Primary files: `packages/backend/convex/parties.ts`
Dependencies: B1, B2
Info needed: list filter (default: open only).
Steps:
1. Add `parties.list` query (status open, sorted by newest).
2. Add `parties.get` query by id.
Acceptance:
1. Client can render party list and detail pages.

- [ ] Task B12: Request join
Skills: $convex-functions
Summary: Add request-to-join mutation with verification checks.
Primary files: `packages/backend/convex/parties.ts`
Dependencies: B4, B8, B11
Info needed: whether to allow owner to join with unverified account (default: yes).
Steps:
1. Validate user owns `playerAccountId`.
2. Require `verificationStatus` = verified for non-owners.
3. Add member with status pending if not already in party.
Acceptance:
1. Verified users can request; unverified are blocked.

- [ ] Task B13: Approve/reject + leave
Skills: $convex-functions
Summary: Leader approves pending members; users can leave.
Primary files: `packages/backend/convex/parties.ts`
Dependencies: B12
Info needed: whether to allow kick after accepted (default: no for MVP).
Steps:
1. `parties.reviewRequest` accepts or rejects, enforcing size limit on accept.
2. `parties.leave` removes member from party.
Acceptance:
1. Approval flow works and respects capacity.

**Frontend: Auth Bootstrap**

- [ ] Task F1: Call `users.getOrCreate` on auth
Skills: (no skill required)
Summary: Ensure users exist before any other mutations.
Primary files: `apps/web/src/main.tsx` or `apps/web/src/routes/__root.tsx` or `apps/web/src/routes/dashboard.tsx`
Dependencies: B3
Info needed: preferred location for bootstrap call (default: root route effect).
Steps:
1. On authenticated session, call `users.getOrCreate` once.
Acceptance:
1. No user-not-found errors in party/account flows.

**Frontend: Profile + Accounts**

- [ ] Task F2: Profile screen for accounts
Skills: $frontend-design
Summary: Add a profile page to manage player accounts.
Primary files: `apps/web/src/routes` (new route), `apps/web/src/components`
Dependencies: B4
Info needed: desired URL (default: `/profile`), list layout preference (default: cards).
Steps:
1. Build UI to list accounts and show verification status.
2. Add form to add new username.
3. Add delete action with confirmation.
Acceptance:
1. Users can add/list/delete accounts in UI.

- [ ] Task F3: Headshot integration
Skills: $frontend-design
Summary: Use existing headshot selector and save to backend.
Primary files: `apps/web/src/components/headshot-selector.tsx`, new profile components
Dependencies: B5, F2
Info needed: whether headshot is required or optional (default: optional).
Steps:
1. Reuse `HeadshotSelector` and call new headshot mutation.
2. Display stored image if available.
Acceptance:
1. Headshot capture and storage works end-to-end.

- [ ] Task F4: Verification UI
Skills: $frontend-design
Summary: Add start/verify/retry controls and instruction display.
Primary files: `apps/web/src/routes` (profile page), `apps/web/src/components`
Dependencies: B7, B8, B9, F2
Info needed: copy tone for instructions (default: direct, game-like).
Steps:
1. Add “Start Verification” and show action instructions.
2. Add “Verify Now” and show status changes.
3. Show retry message if hiscores not updated.
Acceptance:
1. User can complete verification from UI.

**Frontend: Parties**

- [ ] Task F5: Simplify create party form
Skills: $frontend-design
Summary: Replace structured selection with free-text fields.
Primary files: `apps/web/src/components/create-party-form.tsx`
Dependencies: B10
Info needed: max name/description length (default: 80/280).
Steps:
1. Remove `osrs-content` usage and filters.
2. Keep name, description, and party size input.
Acceptance:
1. Parties can be created with name/description only.

- [ ] Task F6: Party list view
Skills: $frontend-design
Summary: Show open parties with basic metadata.
Primary files: `apps/web/src/routes` (new route or home), `apps/web/src/components`
Dependencies: B11
Info needed: list placement (default: home page below create form).
Steps:
1. Query `parties.list` and render cards.
2. Include name, description, size, owner, created time (if available).
Acceptance:
1. Users can browse open parties.

- [ ] Task F7: Party detail view
Skills: $frontend-design
Summary: Show party details and allow join request.
Primary files: `apps/web/src/routes` (new route), `apps/web/src/components`
Dependencies: B11, B12
Info needed: route pattern (default: `/party/$partyId`).
Steps:
1. Fetch party details and render member list.
2. Add “Request to Join” button with account selector.
Acceptance:
1. Verified users can request to join from detail view.

- [ ] Task F8: Leader approvals view
Skills: $frontend-design
Summary: Allow party owners to approve/reject requests.
Primary files: `apps/web/src/routes` (new route or party detail), `apps/web/src/components`
Dependencies: B13
Info needed: where to surface approvals (default: party detail page, owner-only panel).
Steps:
1. Show pending members with approve/reject actions.
2. Disable approve when party is full.
Acceptance:
1. Owners can accept/reject and see immediate updates.

**Testing + Validation**

- [ ] Task T1: Manual verification + join flow test pass
Skills: $convex-security-check
Summary: Run a manual scenario checklist.
Primary files: none
Dependencies: B4–B13, F2–F8
Info needed: any specific account names to test with (default: use your own OSRS account).
Steps:
1. Add account, start verification, verify.
2. Create party, request join, approve.
Acceptance:
1. All steps succeed without errors.

- [ ] Task T2: Error and loading states audit
Skills: $frontend-design
Summary: Ensure UX covers empty, loading, and error states.
Primary files: `apps/web/src/routes`, `apps/web/src/components`
Dependencies: F2–F8
Info needed: preferred toast/alert patterns (default: use existing `sonner` toaster).
Steps:
1. Add loaders for queries and mutations.
2. Add user-facing errors for failures.
Acceptance:
1. No silent failures or blank states.

**Out of Scope (Explicit)**
- RuneLite live tracker integration
- Structured content selection or filter enforcement
- Automated or periodic verification re-checks
