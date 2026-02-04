import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getOptionalUser, requireUser } from "./lib/auth";
import { getStatsByGamemode } from "./osrsHiscores";
import {
	STATS_STALE_MS,
	buildStatsSummary,
	statsSummaryValidator,
} from "./statsSummary";

const accountValidator = v.object({
	_id: v.id("playerAccounts"),
	userId: v.id("users"),
	username: v.string(),
	stats: v.optional(v.id("playerAccountStats")),
});

const playerAccountStatsValidator = v.object({
	_id: v.id("playerAccountStats"),
	_creationTime: v.number(),
	playerAccountId: v.id("playerAccounts"),
	stats: v.string(),
	summary: v.optional(statsSummaryValidator),
	lastUpdated: v.number(),
});

const accountStatsSummaryValidator = v.object({
	accountId: v.id("playerAccounts"),
	username: v.string(),
	summary: v.optional(statsSummaryValidator),
	lastUpdated: v.optional(v.number()),
	isStale: v.boolean(),
});


export const getRefreshContext = internalQuery({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: v.object({
		account: accountValidator,
		stats: v.union(playerAccountStatsValidator, v.null()),
	}),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const account = await ctx.db.get(args.accountId);

		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to refresh this account");
		}

		const stats = account.stats ? await ctx.db.get(account.stats) : null;

		return {
			account: {
				_id: account._id,
				userId: account.userId,
				username: account.username,
				stats: account.stats,
			},
			stats,
		};
	},
});

export const getAccountForRefresh = internalQuery({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: v.object({
		account: v.object({
			_id: v.id("playerAccounts"),
			username: v.string(),
			stats: v.optional(v.id("playerAccountStats")),
		}),
		stats: v.union(playerAccountStatsValidator, v.null()),
	}),
	handler: async (ctx, args) => {
		const account = await ctx.db.get(args.accountId);
		if (!account) {
			throw new ConvexError("Account not found");
		}

		const stats = account.stats ? await ctx.db.get(account.stats) : null;

		return {
			account: {
				_id: account._id,
				username: account.username,
				stats: account.stats,
			},
			stats,
		};
	},
});

export const upsertStats = internalMutation({
	args: {
		accountId: v.id("playerAccounts"),
		statsJson: v.string(),
		summary: statsSummaryValidator,
		lastUpdated: v.number(),
	},
	returns: playerAccountStatsValidator,
	handler: async (ctx, args) => {
		const account = await ctx.db.get(args.accountId);
		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.stats) {
			await ctx.db.patch(account.stats, {
				stats: args.statsJson,
				summary: args.summary,
				lastUpdated: args.lastUpdated,
			});
			const updated = await ctx.db.get(account.stats);
			if (!updated) {
				throw new ConvexError("Stats record not found");
			}
			return updated;
		}

		const statsId = await ctx.db.insert("playerAccountStats", {
			playerAccountId: account._id,
			stats: args.statsJson,
			summary: args.summary,
			lastUpdated: args.lastUpdated,
		});

		await ctx.db.patch(account._id, { stats: statsId });

		const inserted = await ctx.db.get(statsId);
		if (!inserted) {
			throw new ConvexError("Stats record not found");
		}

		return inserted;
	},
});

export const listForUser = query({
	args: {},
	returns: v.array(accountStatsSummaryValidator),
	handler: async (ctx) => {
		const user = await getOptionalUser(ctx);
		if (!user || user.playerAccounts.length === 0) {
			return [];
		}

		const accounts = await Promise.all(
			user.playerAccounts.map((accountId) => ctx.db.get(accountId)),
		);
		const now = Date.now();

		const results = await Promise.all(
			accounts
				.filter(
					(account): account is Doc<"playerAccounts"> => account !== null,
				)
				.map(async (account) => {
					const stats = account.stats ? await ctx.db.get(account.stats) : null;
					const lastUpdated = stats?.lastUpdated;
					const isStale = !lastUpdated || now - lastUpdated > STATS_STALE_MS;
					return {
						accountId: account._id,
						username: account.username,
						summary: stats?.summary,
						lastUpdated,
						isStale,
					};
				}),
		);

		return results;
	},
});
