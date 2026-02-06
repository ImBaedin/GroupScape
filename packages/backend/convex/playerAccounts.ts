import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireUser, getOptionalUser } from "./lib/auth";
import { getUserPartyLock, getUserPartyMemberships } from "./lib/partyMembership";
import { STATS_STALE_MS, statsSummaryValidator } from "./statsSummary";

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
	resourceId: v.optional(v.string()),
	amount: v.optional(v.number()),
});

const playerAccountValidator = v.object({
	_id: v.id("playerAccounts"),
	_creationTime: v.number(),
	userId: v.id("users"),
	stats: v.optional(v.id("playerAccountStats")),
	username: v.string(),
	accountImageStorageId: v.optional(v.id("_storage")),
	verificationStatus: v.optional(verificationStatusValidator),
	verificationChallenge: v.optional(verificationChallengeValidator),
	lastVerifiedAt: v.optional(v.number()),
});

const playerAccountVerificationInfoValidator = v.object({
	_id: v.id("playerAccounts"),
	username: v.string(),
	verificationStatus: v.optional(verificationStatusValidator),
	verificationChallenge: v.optional(verificationChallengeValidator),
});

const memberProfileValidator = v.object({
	accountId: v.id("playerAccounts"),
	username: v.string(),
	headshotUrl: v.optional(v.string()),
	verificationStatus: v.optional(verificationStatusValidator),
	summary: v.optional(statsSummaryValidator),
	lastUpdated: v.optional(v.number()),
	isStale: v.boolean(),
});

const normalizeUsername = (username: string) => username.trim();

const buildMemberProfile = async (
	ctx: QueryCtx,
	account: Doc<"playerAccounts">,
) => {
	const stats = account.stats ? await ctx.db.get(account.stats) : null;
	const lastUpdated = stats?.lastUpdated;
	const isStale = !lastUpdated || Date.now() - lastUpdated > STATS_STALE_MS;
	const headshotUrl = account.accountImageStorageId
		? await ctx.storage.getUrl(account.accountImageStorageId)
		: undefined;

	return {
		accountId: account._id,
		username: account.username,
		headshotUrl: headshotUrl ?? undefined,
		verificationStatus: account.verificationStatus,
		summary: stats?.summary,
		lastUpdated,
		isStale,
	};
};


export const list = query({
	args: {},
	returns: v.array(playerAccountValidator),
	handler: async (ctx) => {
		const user = await getOptionalUser(ctx);
		if (!user) {
			return [];
		}

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

export const getHeadshotUrl = query({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const account = await ctx.db.get(args.accountId);

		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to access this account");
		}

		if (!account.accountImageStorageId) {
			return null;
		}

		return await ctx.storage.getUrl(account.accountImageStorageId);
	},
});

export const getMemberProfile = query({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: memberProfileValidator,
	handler: async (ctx, args) => {
		await requireUser(ctx);

		const account = await ctx.db.get(args.accountId);
		if (!account) {
			throw new ConvexError("Account not found");
		}

		return await buildMemberProfile(ctx, account);
	},
});

export const getMemberProfiles = query({
	args: {
		accountIds: v.array(v.id("playerAccounts")),
	},
	returns: v.array(memberProfileValidator),
	handler: async (ctx, args) => {
		await requireUser(ctx);
		if (args.accountIds.length === 0) {
			return [];
		}

		const uniqueAccountIds = Array.from(new Set(args.accountIds));
		const profiles = await Promise.all(
			uniqueAccountIds.map(async (accountId) => {
				const account = await ctx.db.get(accountId);
				if (!account) {
					return null;
				}
				return await buildMemberProfile(ctx, account);
			}),
		);

		return profiles.filter(
			(
				profile,
			): profile is Awaited<ReturnType<typeof buildMemberProfile>> =>
				profile !== null,
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
			verificationChallenge: account.verificationChallenge,
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

export const markVerified = internalMutation({
	args: {
		accountId: v.id("playerAccounts"),
		lastVerifiedAt: v.number(),
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
			verificationStatus: "verified",
			lastVerifiedAt: args.lastVerifiedAt,
		});

		const updated = await ctx.db.get(args.accountId);
		if (!updated) {
			throw new ConvexError("Account not found");
		}

		return updated;
	},
});

export const cancelVerification = mutation({
	args: {
		accountId: v.id("playerAccounts"),
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

		if (account.verificationStatus !== "pending") {
			throw new ConvexError("No pending verification to cancel");
		}

		await ctx.db.patch(args.accountId, {
			verificationStatus: "unverified",
			verificationChallenge: undefined,
		});

		const updated = await ctx.db.get(args.accountId);
		if (!updated) {
			throw new ConvexError("Account not found");
		}

		return updated;
	},
});

export const setHeadshotStorageId = mutation({
	args: {
		accountId: v.id("playerAccounts"),
		storageId: v.id("_storage"),
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

		const previousStorageId = account.accountImageStorageId;

		await ctx.db.patch(args.accountId, {
			accountImageStorageId: args.storageId,
		});

		if (previousStorageId && previousStorageId !== args.storageId) {
			await ctx.storage.delete(previousStorageId);
		}

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

		const nextAccounts = [...user.playerAccounts, accountId];
		await ctx.db.patch(user._id, {
			playerAccounts: nextAccounts,
			activePlayerAccountId: user.activePlayerAccountId ?? accountId,
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
		const nextActive =
			user.activePlayerAccountId === args.accountId
				? updatedAccounts[0] ?? null
				: user.activePlayerAccountId ?? null;

		const partyMemberships = await getUserPartyMemberships(ctx, user._id);
		const accountIsPartyBound = partyMemberships.some(
			(membership) => membership.playerAccountId === args.accountId,
		);
		if (accountIsPartyBound) {
			throw new ConvexError(
				"Cannot remove an account that is currently tied to a party membership.",
			);
		}

		const partyLock = await getUserPartyLock(ctx, user._id);
		const wouldSwitchActiveAccount =
			user.activePlayerAccountId === args.accountId &&
			nextActive !== user.activePlayerAccountId;
		if (partyLock && wouldSwitchActiveAccount) {
			throw new ConvexError(
				"Cannot remove your active account while you are in a party.",
			);
		}

		await ctx.db.patch(user._id, {
			playerAccounts: updatedAccounts,
			activePlayerAccountId: nextActive,
		});

		if (account.stats) {
			await ctx.db.delete(account.stats);
		}

		if (account.accountImageStorageId) {
			await ctx.storage.delete(account.accountImageStorageId);
		}

		await ctx.db.delete(args.accountId);

		return null;
	},
});

export { remove as delete };
