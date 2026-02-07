# Agent Instructions

- After making changes, run a TypeScript typecheck (`tsc --noEmit`) for the affected package(s) and fix any issues.
- Avoid running `convex codegen` here; it repeatedly fails due to blocked network/Sentry and wastes time. Instead, the user is responsible for running the dev server.

## Discoveries

- Convex CLI treats files in `convex/` as entry points unless the basename has multiple dots (e.g. `*.helper.ts`, `*.test.ts`, `*.int.test.ts`). Keep non-deploy test helpers in `convex/test` named with an extra dot segment so deploy doesn't try to analyze them.
