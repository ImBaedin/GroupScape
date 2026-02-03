import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(
	ctx: GenericCtx<DataModel>,
	{ optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: false,
			requireEmailVerification: false,
		},
		plugins: [crossDomain({ siteUrl }), convex()],
		socialProviders: {
			discord: {
				enabled: true,
				clientId: process.env.DISCORD_CLIENT_ID!,
				clientSecret: process.env.DISCORD_CLIENT_SECRET!,
			},
		},
	});
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	returns: v.any(),
	handler: async (ctx, args) => authComponent.safeGetAuthUser(ctx),
});
