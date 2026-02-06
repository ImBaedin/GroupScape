# Agent Instructions

- After making changes, run a TypeScript typecheck (`tsc --noEmit`) for the affected package(s) and fix any issues.
- Avoid running `convex codegen` here; it repeatedly fails due to blocked network/Sentry and wastes time. Instead, the user is responsible for running the dev server.

## Discoveries

- React Compiler for the web app is configured via Vite Babel plugin integration in `apps/web/vite.config.ts` using `babel-plugin-react-compiler`.
- `apps/web/src/components/profile-badge.tsx` now batches headshots via `api.playerAccounts.getMemberProfiles` instead of per-row `getHeadshotUrl` subscriptions.
