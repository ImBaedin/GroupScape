## Discoveries

- React Compiler for the web app is configured via Vite Babel plugin integration in `apps/web/vite.config.ts` using `babel-plugin-react-compiler`.
- `apps/web/src/components/profile-badge.tsx` now batches headshots via `api.playerAccounts.getMemberProfiles` instead of per-row `getHeadshotUrl` subscriptions.
- Profile feature query gating is now standardized on `"skip"` for unauthenticated states in `useProfileQueries` and `ProfileBadge`.
