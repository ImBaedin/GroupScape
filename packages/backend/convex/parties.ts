import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { STATS_STALE_MS, statsSummaryValidator } from "./statsSummary";

const memberStatusValidator = v.union(
	v.literal("pending"),
	v.literal("accepted"),
);

const partyStatusValidator = v.union(v.literal("open"), v.literal("closed"));
const verificationStatusValidator = v.union(
	v.literal("unverified"),
	v.literal("pending"),
	v.literal("verified"),
);

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
	returns: v.array(partyValidator),
	handler: async (ctx) => {
		await requireUser(ctx);

		return await ctx.db
			.query("parties")
			.withIndex("by_status_and_createdAt", (q) => q.eq("status", "open"))
			.order("desc")
			.collect();
	},
});

const activePartyValidator = v.object({
	_id: v.id("parties"),
	_creationTime: v.number(),
	name: v.string(),
	status: v.optional(partyStatusValidator),
	createdAt: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
});

export const getActiveForUser = query({
	args: {},
	returns: v.union(activePartyValidator, v.null()),
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const parties = await ctx.db.query("parties").collect();

		const candidates = parties.filter(
			(party) =>
				party.ownerId === user._id ||
				party.members.some(
					(member) =>
						member.memberId === user._id && member.status === "accepted",
				),
		);

		if (candidates.length === 0) {
			return null;
		}

		const sortValue = (party: Doc<"parties">) =>
			party.updatedAt ?? party.createdAt ?? party._creationTime;

		const openCandidates = candidates.filter(
			(party) => party.status !== "closed",
		);
		const pool = openCandidates.length > 0 ? openCandidates : candidates;

		const active = [...pool].sort((a, b) => sortValue(b) - sortValue(a))[0];

		return {
			_id: active._id,
			_creationTime: active._creationTime,
			name: active.name,
			status: active.status,
			createdAt: active.createdAt,
			updatedAt: active.updatedAt,
		};
	},
});

export const get = query({
	args: {
		partyId: v.id("parties"),
	},
	returns: v.union(partyValidator, v.null()),
	handler: async (ctx, args) => {
		await requireUser(ctx);
		return await ctx.db.get(args.partyId);
	},
});

export const getWithMemberStats = query({
	args: {
		partyId: v.id("parties"),
	},
	returns: v.union(partyWithStatsValidator, v.null()),
	handler: async (ctx, args) => {
		await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			return null;
		}

		const owner = await ctx.db.get(party.ownerId);
		const leaderAccountId =
			owner?.activePlayerAccountId ?? undefined;

		const accountIds = new Set<Doc<"playerAccounts">["_id"]>();
		if (leaderAccountId) {
			accountIds.add(leaderAccountId);
		}
		for (const member of party.members) {
			accountIds.add(member.playerAccountId);
		}

		const accountList = await Promise.all(
			Array.from(accountIds).map((accountId) => ctx.db.get(accountId)),
		);

		const accountMap = new Map<Doc<"playerAccounts">["_id"], Doc<"playerAccounts">>();
		for (const account of accountList) {
			if (account) {
				accountMap.set(account._id, account);
			}
		}

		const statsEntries = await Promise.all(
			Array.from(accountMap.values()).map(async (account) => ({
				accountId: account._id,
				stats: account.stats ? await ctx.db.get(account.stats) : null,
			})),
		);

		const statsMap = new Map<Doc<"playerAccounts">["_id"], Doc<"playerAccountStats">>();
		for (const entry of statsEntries) {
			if (entry.stats) {
				statsMap.set(entry.accountId, entry.stats);
			}
		}

		const now = Date.now();

		const buildEntry = async (
			memberId: Doc<"users">["_id"],
			playerAccountId: Doc<"playerAccounts">["_id"] | undefined,
			status: "leader" | "accepted" | "pending",
		) => {
			const account = playerAccountId ? accountMap.get(playerAccountId) : undefined;
			const stats = account ? statsMap.get(account._id) : undefined;
			const lastUpdated = stats?.lastUpdated;
			const isStale = !lastUpdated || now - lastUpdated > STATS_STALE_MS;
			const headshotUrl = account?.accountImageStorageId
				? await ctx.storage.getUrl(account.accountImageStorageId)
				: undefined;
			return {
				memberId,
				playerAccountId,
				username: account?.username,
				headshotUrl: headshotUrl ?? undefined,
				status,
				verificationStatus: account?.verificationStatus,
				summary: stats?.summary,
				lastUpdated,
				isStale,
			};
		};

		const memberStats = await Promise.all([
			buildEntry(party.ownerId, leaderAccountId, "leader"),
			...party.members.map((member) =>
				buildEntry(member.memberId, member.playerAccountId, member.status),
			),
		]);

		return { party, memberStats };
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		partySizeLimit: v.number(),
	},
	returns: v.id("parties"),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const now = Date.now();

		// Create the party
		const partyId = await ctx.db.insert("parties", {
			ownerId: user._id,
			members: [],
			name: args.name,
			description: args.description,
			partySizeLimit: args.partySizeLimit,
			status: "open",
			createdAt: now,
			updatedAt: now,
		});

		return partyId;
	},
});

export const requestJoin = mutation({
	args: {
		partyId: v.id("parties"),
		playerAccountId: v.id("playerAccounts"),
	},
	returns: partyValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			throw new ConvexError("Party not found");
		}

		if (party.status === "closed") {
			throw new ConvexError("Party is closed");
		}

		const account = await ctx.db.get(args.playerAccountId);
		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to use this account");
		}

		const alreadyMember = party.members.some(
			(member) =>
				member.memberId === user._id ||
				member.playerAccountId === args.playerAccountId,
		);

		if (alreadyMember) {
			throw new ConvexError("Already requested to join");
		}

		const isOwner = party.ownerId === user._id;
		if (isOwner) {
			throw new ConvexError("Party owner is already part of this party");
		}

		if (!isOwner && account.verificationStatus !== "verified") {
			throw new ConvexError("Account must be verified to request to join");
		}

		const now = Date.now();
		const nextMembers = [
			...party.members,
			{
				memberId: user._id,
				playerAccountId: args.playerAccountId,
				status: "pending" as const,
			},
		];

		await ctx.db.patch(args.partyId, {
			members: nextMembers,
			updatedAt: now,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});

export const reviewRequest = mutation({
	args: {
		partyId: v.id("parties"),
		memberId: v.id("users"),
		playerAccountId: v.id("playerAccounts"),
		approve: v.boolean(),
	},
	returns: partyValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			throw new ConvexError("Party not found");
		}

		if (party.ownerId !== user._id) {
			throw new ConvexError("Not authorized to review requests");
		}

		const memberIndex = party.members.findIndex(
			(member) =>
				member.memberId === args.memberId &&
				member.playerAccountId === args.playerAccountId,
		);

		if (memberIndex === -1) {
			throw new ConvexError("Membership request not found");
		}

		const member = party.members[memberIndex];
		if (member.status !== "pending") {
			throw new ConvexError("Membership request is not pending");
		}

		if (args.approve) {
			if (party.status === "closed") {
				throw new ConvexError("Party is closed");
			}

			const acceptedCount =
				party.members.filter((entry) => entry.status === "accepted").length + 1;

			if (acceptedCount >= party.partySizeLimit) {
				throw new ConvexError("Party is full");
			}
		}

		const now = Date.now();
		const nextMembers = args.approve
			? party.members.map((entry, index) =>
					index === memberIndex
						? { ...entry, status: "accepted" as const }
						: entry,
				)
			: party.members.filter((_, index) => index !== memberIndex);

		await ctx.db.patch(args.partyId, {
			members: nextMembers,
			updatedAt: now,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});

export const updateDetails = mutation({
	args: {
		partyId: v.id("parties"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	returns: partyValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			throw new ConvexError("Party not found");
		}

		if (party.ownerId !== user._id) {
			throw new ConvexError("Not authorized to edit this party");
		}

		const trimmedName = args.name.trim();
		if (trimmedName.length === 0) {
			throw new ConvexError("Party name cannot be empty");
		}

		const trimmedDescription = args.description?.trim();
		const now = Date.now();

		await ctx.db.patch(args.partyId, {
			name: trimmedName,
			description: trimmedDescription && trimmedDescription.length > 0
				? trimmedDescription
				: undefined,
			updatedAt: now,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});

export const updateStatus = mutation({
	args: {
		partyId: v.id("parties"),
		status: partyStatusValidator,
	},
	returns: partyValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			throw new ConvexError("Party not found");
		}

		if (party.ownerId !== user._id) {
			throw new ConvexError("Not authorized to update party status");
		}

		const now = Date.now();
		await ctx.db.patch(args.partyId, {
			status: args.status,
			updatedAt: now,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});

export const remove = mutation({
	args: {
		partyId: v.id("parties"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			throw new ConvexError("Party not found");
		}

		if (party.ownerId !== user._id) {
			throw new ConvexError("Not authorized to remove this party");
		}

		await ctx.db.delete(args.partyId);
		return null;
	},
});

export const leave = mutation({
	args: {
		partyId: v.id("parties"),
		playerAccountId: v.id("playerAccounts"),
	},
	returns: partyValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const party = await ctx.db.get(args.partyId);
		if (!party) {
			throw new ConvexError("Party not found");
		}

		const memberIndex = party.members.findIndex(
			(member) =>
				member.memberId === user._id &&
				member.playerAccountId === args.playerAccountId,
		);

		if (memberIndex === -1) {
			throw new ConvexError("You are not a member of this party");
		}

		const now = Date.now();
		const nextMembers = party.members.filter(
			(_, index) => index !== memberIndex,
		);

		await ctx.db.patch(args.partyId, {
			members: nextMembers,
			updatedAt: now,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});
