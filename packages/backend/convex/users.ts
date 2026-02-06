import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getOptionalUser, requireUser } from "./lib/auth";
import { getUserPartyLock } from "./lib/partyMembership";

const userValidator = v.object({
	_id: v.id("users"),
	_creationTime: v.number(),
	tokenIdentifier: v.string(),
	playerAccounts: v.array(v.id("playerAccounts")),
	activePlayerAccountId: v.optional(v.union(v.null(), v.id("playerAccounts"))),
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

export const getCurrent = query({
	args: {},
	returns: v.union(v.null(), userValidator),
	handler: async (ctx) => {
		const user = await getOptionalUser(ctx);
		return user ?? null;
	},
});

export const setActiveAccount = mutation({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: userValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const account = await ctx.db.get(args.accountId);
		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to select this account");
		}

		const partyLock = await getUserPartyLock(ctx, user._id);
		if (partyLock) {
			throw new ConvexError(
				"Cannot switch active account while you are in a party.",
			);
		}

		await ctx.db.patch(user._id, {
			activePlayerAccountId: args.accountId,
		});

		const updated = await ctx.db.get(user._id);
		if (!updated) {
			throw new ConvexError("User not found");
		}

		return updated;
	},
});
