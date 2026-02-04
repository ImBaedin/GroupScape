"use node";

import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { getStatsByGamemode } from "./osrsHiscores";
import { buildStatsSummary } from "./statsSummary";

const memberStatusValidator = v.union(
	v.literal("pending"),
	v.literal("accepted"),
);

const partyStatusValidator = v.union(v.literal("open"), v.literal("closed"));

const partyMemberValidator = v.object({
	memberId: v.id("users"),
	playerAccountId: v.id("playerAccounts"),
	status: memberStatusValidator,
});

const partyValidator = v.object({
	_id: v.id("parties"),
	_creationTime: v.number(),
	ownerId: v.id("users"),
	members: v.array(partyMemberValidator),
	name: v.string(),
	description: v.optional(v.string()),
	partySizeLimit: v.number(),
	status: v.optional(partyStatusValidator),
	createdAt: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
});

const verificationStatusValidator = v.union(
	v.literal("unverified"),
	v.literal("pending"),
	v.literal("verified"),
);

const statsSummaryValidator = v.object({
	combatLevel: v.number(),
	totalLevel: v.number(),
	combatSkills: v.object({
		attack: v.number(),
		strength: v.number(),
		defence: v.number(),
		hitpoints: v.number(),
		ranged: v.number(),
		magic: v.number(),
		prayer: v.number(),
	}),
	bossKc: v.array(
		v.object({
			key: v.string(),
			label: v.string(),
			score: v.number(),
			rank: v.number(),
		}),
	),
});

const partyMemberStatsValidator = v.object({
	memberId: v.id("users"),
	playerAccountId: v.optional(v.id("playerAccounts")),
	username: v.optional(v.string()),
	headshotUrl: v.optional(v.string()),
	status: v.union(
		v.literal("leader"),
		v.literal("accepted"),
		v.literal("pending"),
	),
	verificationStatus: v.optional(verificationStatusValidator),
	summary: v.optional(statsSummaryValidator),
	lastUpdated: v.optional(v.number()),
	isStale: v.boolean(),
});

const partyWithStatsValidator = v.object({
	party: partyValidator,
	memberStats: v.array(partyMemberStatsValidator),
});

type MemberStatsEntry = {
	playerAccountId?: string;
	isStale: boolean;
};

export const getWithMemberStats = action({
	args: {
		partyId: v.id("parties"),
	},
	returns: v.union(partyWithStatsValidator, v.null()),
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new ConvexError("Not authenticated");
		}

		const initial = await ctx.runQuery(anyApi.parties.getWithMemberStats, {
			partyId: args.partyId,
		});

		if (!initial) {
			return null;
		}

		const staleAccounts = (initial.memberStats as MemberStatsEntry[]).filter(
			(entry) => entry.isStale && entry.playerAccountId,
		);

		if (staleAccounts.length === 0) {
			return initial;
		}

		for (const entry of staleAccounts) {
			try {
				const accountId = entry.playerAccountId;
				if (!accountId) {
					continue;
				}
				const context = await ctx.runQuery(
					anyApi.playerAccountStats.getAccountForRefresh,
					{ accountId },
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

		return await ctx.runQuery(anyApi.parties.getWithMemberStats, {
			partyId: args.partyId,
		});
	},
});
