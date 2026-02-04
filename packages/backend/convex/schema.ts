import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { statsSummaryValidator } from "./statsSummary";

const memberStatus = v.union(v.literal("pending"), v.literal("accepted"));
const partyStatus = v.union(v.literal("open"), v.literal("closed"));
const verificationStatus = v.union(
	v.literal("unverified"),
	v.literal("pending"),
	v.literal("verified"),
);
const verificationChallenge = v.object({
	skill: v.string(),
	expectedXp: v.number(),
	baselineXp: v.number(),
	issuedAt: v.number(),
	resourceId: v.optional(v.string()),
	amount: v.optional(v.number()),
});

export default defineSchema({
	todos: defineTable({
		text: v.string(),
		completed: v.boolean(),
	}),

	// User table
	users: defineTable({
		tokenIdentifier: v.string(),
		playerAccounts: v.array(v.id("playerAccounts")),
		activePlayerAccountId: v.optional(
			v.union(v.null(), v.id("playerAccounts")),
		),
	}),

	/**
	 * Player accounts table
	 *
	 * This stores individual player accounts for a user.
	 */
	playerAccounts: defineTable({
		userId: v.id("users"),
		stats: v.optional(v.id("playerAccountStats")),
		username: v.string(),
		/**
		 * Convex storage ID for the account image.
		 */
		accountImageStorageId: v.optional(v.id("_storage")),
		verificationStatus: v.optional(verificationStatus),
		verificationChallenge: v.optional(verificationChallenge),
		lastVerifiedAt: v.optional(v.number()),
	}),

	/**
	 * Player account stats table
	 *
	 * This stores the JSON hiscores payload for a player account.
	 * Parse with `parseJsonStats` from `osrsHiscores` if needed.
	 */
	playerAccountStats: defineTable({
		playerAccountId: v.id("playerAccounts"),
		/**
		 * JSON payload of hiscores stats.
		 */
		stats: v.string(),
		/**
		 * Summary snapshot for quick UI display.
		 */
		summary: v.optional(statsSummaryValidator),
		/**
		 * Last updated timestamp.
		 */
		lastUpdated: v.number(),
	}),

	/**
	 * Parties table
	 */
	parties: defineTable({
		ownerId: v.id("users"),
		members: v.array(
			v.object({
				memberId: v.id("users"),
				playerAccountId: v.id("playerAccounts"),

				status: memberStatus,
			}),
		),

		name: v.string(),
		description: v.optional(v.string()),
		searchText: v.optional(v.string()),
		partySizeLimit: v.number(),
		status: v.optional(partyStatus),
		createdAt: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
	})
		.index("by_status_and_createdAt", ["status", "createdAt"])
		.index("by_ownerId", ["ownerId"])
		.searchIndex("search_parties", {
			searchField: "searchText",
			filterFields: ["status"],
		}),

	partyMetrics: defineTable({
		kind: v.literal("partyMetrics"),
		activeParties: v.number(),
		activePlayers: v.number(),
		totalParties: v.number(),
		totalPlayers: v.number(),
		updatedAt: v.number(),
	}).index("by_kind", ["kind"]),
});
