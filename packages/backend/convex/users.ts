import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const userValidator = v.object({
	_id: v.id("users"),
	_creationTime: v.number(),
	tokenIdentifier: v.string(),
	playerAccounts: v.array(v.id("playerAccounts")),
});

export const getOrCreate = mutation({
	args: {},
	returns: userValidator,
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new ConvexError("Not authenticated");
		}

		const existingUser = await ctx.db
			.query("users")
			.filter((q) =>
				q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier),
			)
			.first();

		if (existingUser) {
			return existingUser;
		}

		const userId = await ctx.db.insert("users", {
			tokenIdentifier: identity.tokenIdentifier,
			playerAccounts: [],
		});

		const newUser = await ctx.db.get(userId);
		if (!newUser) {
			throw new ConvexError("Failed to create user");
		}

		return newUser;
	},
});
