"use node";

import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getStatsByGamemode } from "./osrsHiscores";
import {
	STATS_STALE_MS,
	buildStatsSummary,
	statsSummaryValidator,
	type StatsSummary,
} from "./statsSummary";

export const refresh = action({
	args: {
		accountId: v.id("playerAccounts"),
		force: v.optional(v.boolean()),
	},
	returns: v.object({
		summary: statsSummaryValidator,
		lastUpdated: v.number(),
		isStale: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const context = await ctx.runQuery(
			anyApi.playerAccountStats.getRefreshContext,
			{ accountId: args.accountId },
		);

		const now = Date.now();
		const existing = context.stats;
		const hasFreshCache = Boolean(
			existing?.summary &&
				existing.lastUpdated &&
				now - existing.lastUpdated < STATS_STALE_MS,
		);

		if (!args.force && hasFreshCache && existing?.summary) {
			return {
				summary: existing.summary,
				lastUpdated: existing.lastUpdated,
				isStale: false,
			};
		}

		let stats;
		try {
			stats = await getStatsByGamemode(context.account.username);
		} catch {
			throw new ConvexError("Unable to fetch hiscores for that username");
		}

		const summary = buildStatsSummary(stats);
		const statsJson = JSON.stringify(stats);

		await ctx.runMutation(anyApi.playerAccountStats.upsertStats, {
			accountId: context.account._id,
			statsJson,
			summary,
			lastUpdated: now,
		});

		return {
			summary,
			lastUpdated: now,
			isStale: false,
		};
	},
});

const accountStatsSummaryValidator = v.object({
	accountId: v.id("playerAccounts"),
	username: v.string(),
	summary: v.optional(statsSummaryValidator),
	lastUpdated: v.optional(v.number()),
	isStale: v.boolean(),
});

type AccountStatsSummary = {
	accountId: Id<"playerAccounts">;
	username: string;
	summary?: StatsSummary;
	lastUpdated?: number;
	isStale: boolean;
};

export const listForUser = action({
	args: {},
	returns: v.array(accountStatsSummaryValidator),
	handler: async (ctx) => {
		const initial = (await ctx.runQuery(
			anyApi.playerAccountStats.listForUser,
			{},
		)) as AccountStatsSummary[];

		const staleAccounts = initial.filter((entry) => entry.isStale);
		if (staleAccounts.length === 0) {
			return initial;
		}

		for (const entry of staleAccounts) {
			try {
				const context = await ctx.runQuery(
					anyApi.playerAccountStats.getRefreshContext,
					{ accountId: entry.accountId },
				);
				const now = Date.now();
				const stats = await getStatsByGamemode(context.account.username);
				const summary = buildStatsSummary(stats);
				const statsJson = JSON.stringify(stats);

				await ctx.runMutation(anyApi.playerAccountStats.upsertStats, {
					accountId: context.account._id,
					statsJson,
					summary,
					lastUpdated: now,
				});
			} catch {
				// Ignore refresh failures; stale data remains.
			}
		}

		return await ctx.runQuery(anyApi.playerAccountStats.listForUser, {});
	},
});
