import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const verificationStatusValidator = v.union(
	v.literal("unverified"),
	v.literal("pending"),
	v.literal("verified"),
);

const verificationChallengeValidator = v.object({
	skill: v.string(),
	expectedXp: v.number(),
	baselineXp: v.number(),
	issuedAt: v.number(),
});

const playerAccountValidator = v.object({
	_id: v.id("playerAccounts"),
	_creationTime: v.number(),
	userId: v.id("users"),
	stats: v.optional(v.id("playerAccountStats")),
	username: v.string(),
	accountImageStorageId: v.optional(v.string()),
	verificationStatus: v.optional(verificationStatusValidator),
	verificationChallenge: v.optional(verificationChallengeValidator),
	lastVerifiedAt: v.optional(v.number()),
});

const playerAccountVerificationInfoValidator = v.object({
	_id: v.id("playerAccounts"),
	username: v.string(),
	verificationStatus: v.optional(verificationStatusValidator),
});

const normalizeUsername = (username: string) => username.trim();

type AuthedCtx = QueryCtx | MutationCtx;

const requireUser = async (ctx: AuthedCtx) => {
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

	return user as Doc<"users">;
};

export const list = query({
	args: {},
	returns: v.array(playerAccountValidator),
	handler: async (ctx) => {
		const user = await requireUser(ctx);

		if (user.playerAccounts.length === 0) {
			return [];
		}

		const accounts = await Promise.all(
			user.playerAccounts.map((accountId) => ctx.db.get(accountId)),
		);

		return accounts.filter(
			(account): account is Doc<"playerAccounts"> => account !== null,
		);
	},
});

export const getForVerification = internalQuery({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: playerAccountVerificationInfoValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const account = await ctx.db.get(args.accountId);

		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to access this account");
		}

		return {
			_id: account._id,
			username: account.username,
			verificationStatus: account.verificationStatus,
		};
	},
});

export const setVerificationChallenge = internalMutation({
	args: {
		accountId: v.id("playerAccounts"),
		challenge: verificationChallengeValidator,
	},
	returns: playerAccountValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const account = await ctx.db.get(args.accountId);

		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to update this account");
		}

		await ctx.db.patch(args.accountId, {
			verificationStatus: "pending",
			verificationChallenge: args.challenge,
		});

		const updated = await ctx.db.get(args.accountId);
		if (!updated) {
			throw new ConvexError("Account not found");
		}

		return updated;
	},
});

export const add = mutation({
	args: {
		username: v.string(),
	},
	returns: playerAccountValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const trimmedUsername = normalizeUsername(args.username);

		if (trimmedUsername.length === 0) {
			throw new ConvexError("Username cannot be empty");
		}

		const normalized = trimmedUsername.toLowerCase();

		if (user.playerAccounts.length > 0) {
			const existingAccounts = await Promise.all(
				user.playerAccounts.map((accountId) => ctx.db.get(accountId)),
			);

			const duplicate = existingAccounts.find((account) => {
				if (!account) {
					return false;
				}
				return account.username.trim().toLowerCase() === normalized;
			});

			if (duplicate) {
				throw new ConvexError("That username is already linked");
			}
		}

		const accountId = await ctx.db.insert("playerAccounts", {
			userId: user._id,
			username: trimmedUsername,
			verificationStatus: "unverified",
		});

		await ctx.db.patch(user._id, {
			playerAccounts: [...user.playerAccounts, accountId],
		});

		const account = await ctx.db.get(accountId);
		if (!account) {
			throw new ConvexError("Failed to create player account");
		}

		return account;
	},
});

const remove = mutation({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const account = await ctx.db.get(args.accountId);

		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to delete this account");
		}

		const updatedAccounts = user.playerAccounts.filter(
			(id) => id !== args.accountId,
		);

		await ctx.db.patch(user._id, {
			playerAccounts: updatedAccounts,
		});

		if (account.stats) {
			await ctx.db.delete(account.stats);
		}

		await ctx.db.delete(args.accountId);

		return null;
	},
});

export { remove as delete };
