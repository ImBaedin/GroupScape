import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthedCtx = QueryCtx | MutationCtx;

export const getOptionalUser = async (
	ctx: AuthedCtx,
): Promise<Doc<"users"> | null> => {
	const identity = await ctx.auth.getUserIdentity();
	if (identity === null) {
		return null;
	}

	const user = await ctx.db
		.query("users")
		.filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
		.first();

	return user ?? null;
};

export const requireUser = async (ctx: AuthedCtx): Promise<Doc<"users">> => {
	const identity = await ctx.auth.getUserIdentity();
	if (identity === null) {
		throw new ConvexError("Not authenticated");
	}

	const user = await ctx.db
		.query("users")
		.filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
		.first();

	if (!user) {
		throw new ConvexError("User not found");
	}

	return user;
};
