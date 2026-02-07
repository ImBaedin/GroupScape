import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import schema from "../schema";

const modules: Record<string, () => Promise<unknown>> = {
	"../_generated/api.js": () => import("../_generated/api.js"),
	"../_generated/server.js": () => import("../_generated/server.js"),
	"../auth.config.ts": () => import("../auth.config"),
	"../auth.ts": () => import("../auth"),
	"../convex.config.ts": () => import("../convex.config"),
	"../headshots.ts": () => import("../headshots"),
	"../healthCheck.ts": () => import("../healthCheck"),
	"../http.ts": () => import("../http"),
	"../lib/auth.ts": () => import("../lib/auth"),
	"../lib/partyMembership.ts": () => import("../lib/partyMembership"),
	"../osrsHiscores.ts": () => import("../osrsHiscores"),
	"../parties.ts": () => import("../parties"),
	"../partiesActions.ts": () => import("../partiesActions"),
	"../player.ts": () => import("../player"),
	"../playerAccounts.ts": () => import("../playerAccounts"),
	"../playerAccountStats.ts": () => import("../playerAccountStats"),
	"../playerAccountStatsActions.ts": () => import("../playerAccountStatsActions"),
	"../privateData.ts": () => import("../privateData"),
	"../schema.ts": () => import("../schema"),
	"../statsSummary.ts": () => import("../statsSummary"),
	"../todos.ts": () => import("../todos"),
	"../users.ts": () => import("../users"),
	"../verification.ts": () => import("../verification"),
	"../verificationActions.ts": () => import("../verificationActions"),
};

export function createConvexTest() {
	return convexTest(schema, modules);
}

export function identityFor(seed: string) {
	const subject = seed
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const resolvedSubject = subject || "test-user";
	const issuer = "https://groupscape.test";
	return {
		issuer,
		subject: resolvedSubject,
		tokenIdentifier: `${issuer}|${resolvedSubject}`,
	};
}

export async function createAuthedUser(
	t: ReturnType<typeof createConvexTest>,
	seed: string,
) {
	const authed = t.withIdentity(identityFor(seed));
	const user = await authed.mutation(api.users.getOrCreate, {});
	return { authed, user };
}
