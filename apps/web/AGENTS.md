## Discoveries

- React Compiler for the web app is configured via Vite Babel plugin integration in `apps/web/vite.config.ts` using `babel-plugin-react-compiler`.
- `apps/web/src/components/profile-badge.tsx` now batches headshots via `api.playerAccounts.getMemberProfiles` instead of per-row `getHeadshotUrl` subscriptions.
- Profile feature query gating is now standardized on `"skip"` for unauthenticated states in `useProfileQueries` and `ProfileBadge`.
- `apps/web/src/routes/party-tracker.tsx` should keep `@GroupScape/runelite-party-client` as a dynamic import inside the route component to avoid pulling tracker code into the initial route-tree bundle.
- `apps/web/src/components/headshot-selector.tsx` centralizes PLY decoding in `usePlyGeometry`; preserve explicit geometry disposal and ref-driven drag motion to avoid GPU leaks and per-frame React re-renders.
