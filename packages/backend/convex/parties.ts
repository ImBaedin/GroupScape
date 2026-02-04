import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const memberStatusValidator = v.union(
	v.literal("pending"),
	v.literal("accepted"),
);
const partyMemberRoleValidator = v.union(
	v.literal("leader"),
	v.literal("member"),
);

const partyStatusValidator = v.union(v.literal("open"), v.literal("closed"));
const partyMemberValidator = v.object({
	memberId: v.id("users"),
	playerAccountId: v.optional(v.id("playerAccounts")),
	status: memberStatusValidator,
	role: v.optional(partyMemberRoleValidator),
});

const partyValidator = v.object({
	_id: v.id("parties"),
	_creationTime: v.number(),
	ownerId: v.id("users"),
	members: v.array(partyMemberValidator),
	name: v.string(),
	description: v.optional(v.string()),
	searchText: v.optional(v.string()),
	partySizeLimit: v.number(),
	status: v.optional(partyStatusValidator),
	createdAt: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
});

const partyMetricsSnapshotValidator = v.object({
	activeParties: v.number(),
	activePlayers: v.number(),
	totalParties: v.number(),
	totalPlayers: v.number(),
	updatedAt: v.number(),
});

const PARTY_METRICS_KIND = "partyMetrics";

const normalizeSearchText = (value: string) =>
	value
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

const buildPartySearchText = (name: string, description?: string) => {
	const parts = [name, description]
		.map((value) => value?.trim())
		.filter((value): value is string => Boolean(value && value.length > 0));
	return normalizeSearchText(parts.join(" "));
};

const isPartyActive = (status: Doc<"parties">["status"]) => status !== "closed";

const getPartyPlayerCount = (party: Doc<"parties">) => {
	const hasLeader = party.members.some((member) => member.role === "leader");
	return party.members.length + (hasLeader ? 0 : 1);
};

const getPartyMetricsDoc = async (ctx: MutationCtx | QueryCtx) =>
	ctx.db
		.query("partyMetrics")
		.withIndex("by_kind", (q) => q.eq("kind", PARTY_METRICS_KIND))
		.first();

const ensurePartyMetrics = async (ctx: MutationCtx) => {
	const existing = await getPartyMetricsDoc(ctx);
	if (existing) {
		return existing;
	}

	const now = Date.now();
	const metricsId = await ctx.db.insert("partyMetrics", {
		kind: PARTY_METRICS_KIND,
		activeParties: 0,
		activePlayers: 0,
		totalParties: 0,
		totalPlayers: 0,
		updatedAt: now,
	});

	const inserted = await ctx.db.get(metricsId);
	if (!inserted) {
		throw new ConvexError("Failed to initialize party metrics");
	}

	return inserted;
};

type PartyMetricsDelta = {
	activeParties?: number;
	activePlayers?: number;
	totalParties?: number;
	totalPlayers?: number;
};

const applyPartyMetricsDelta = async (
	ctx: MutationCtx,
	delta: PartyMetricsDelta,
) => {
	const metrics = await ensurePartyMetrics(ctx);
	const next = {
		activeParties: Math.max(
			0,
			metrics.activeParties + (delta.activeParties ?? 0),
		),
		activePlayers: Math.max(
			0,
			metrics.activePlayers + (delta.activePlayers ?? 0),
		),
		totalParties: Math.max(
			0,
			metrics.totalParties + (delta.totalParties ?? 0),
		),
		totalPlayers: Math.max(
			0,
			metrics.totalPlayers + (delta.totalPlayers ?? 0),
		),
		updatedAt: Date.now(),
	};

	await ctx.db.patch(metrics._id, next);
	return next;
};

const setPartyMetricsSnapshot = async (
	ctx: MutationCtx,
	snapshot: {
		activeParties: number;
		activePlayers: number;
		totalParties: number;
		totalPlayers: number;
	},
) => {
	const metrics = await ensurePartyMetrics(ctx);
	const next = {
		...snapshot,
		updatedAt: Date.now(),
	};
	await ctx.db.patch(metrics._id, next);
	return next;
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

export const searchActive = query({
	args: {
		query: v.string(),
		limit: v.optional(v.number()),
	},
	returns: v.array(partyValidator),
	handler: async (ctx, args) => {
		const trimmedQuery = args.query.trim();
		if (trimmedQuery.length === 0) {
			return [];
		}

		const limit = Math.min(Math.max(args.limit ?? 6, 1), 50);

		return await ctx.db
			.query("parties")
			.withSearchIndex("search_parties", (q) =>
				q.search("searchText", trimmedQuery).eq("status", "open"),
			)
			.take(limit);
	},
});

export const getHomeMetrics = query({
	args: {},
	returns: partyMetricsSnapshotValidator,
	handler: async (ctx) => {
		const metrics = await getPartyMetricsDoc(ctx);
		if (!metrics) {
			return {
				activeParties: 0,
				activePlayers: 0,
				totalParties: 0,
				totalPlayers: 0,
				updatedAt: 0,
			};
		}

		return {
			activeParties: metrics.activeParties,
			activePlayers: metrics.activePlayers,
			totalParties: metrics.totalParties,
			totalPlayers: metrics.totalPlayers,
			updatedAt: metrics.updatedAt,
		};
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
		const searchText = buildPartySearchText(args.name, args.description);
		const leaderEntry = {
			memberId: user._id,
			playerAccountId: user.activePlayerAccountId ?? undefined,
			status: "accepted" as const,
			role: "leader" as const,
		};

		// Create the party
		const partyId = await ctx.db.insert("parties", {
			ownerId: user._id,
			members: [leaderEntry],
			name: args.name,
			description: args.description,
			searchText,
			partySizeLimit: args.partySizeLimit,
			status: "open",
			createdAt: now,
			updatedAt: now,
		});

		await applyPartyMetricsDelta(ctx, {
			activeParties: 1,
			activePlayers: 1,
			totalParties: 1,
			totalPlayers: 1,
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

		const isActive = isPartyActive(party.status);

		const account = await ctx.db.get(args.playerAccountId);
		if (!account) {
			throw new ConvexError("Account not found");
		}

		if (account.userId !== user._id) {
			throw new ConvexError("Not authorized to use this account");
		}

		const isOwner = party.ownerId === user._id;
		if (isOwner) {
			throw new ConvexError("Party owner is already part of this party");
		}

		const alreadyMember = party.members.some(
			(member) =>
				member.role !== "leader" &&
				(member.memberId === user._id ||
					member.playerAccountId === args.playerAccountId),
		);

		if (alreadyMember) {
			throw new ConvexError("Already requested to join");
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
				role: "member" as const,
			},
		];

		await ctx.db.patch(args.partyId, {
			members: nextMembers,
			updatedAt: now,
		});

		await applyPartyMetricsDelta(ctx, {
			totalPlayers: 1,
			activePlayers: isActive ? 1 : 0,
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
				member.role !== "leader" &&
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

		const isActive = isPartyActive(party.status);

		if (args.approve) {
			if (party.status === "closed") {
				throw new ConvexError("Party is closed");
			}

			const acceptedCount =
				party.members.filter(
					(entry) => entry.role !== "leader" && entry.status === "accepted",
				).length + 1;

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

		if (!args.approve) {
			await applyPartyMetricsDelta(ctx, {
				totalPlayers: -1,
				activePlayers: isActive ? -1 : 0,
			});
		}

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
		const searchText = buildPartySearchText(trimmedName, trimmedDescription);
		const now = Date.now();

		await ctx.db.patch(args.partyId, {
			name: trimmedName,
			description: trimmedDescription && trimmedDescription.length > 0
				? trimmedDescription
				: undefined,
			searchText,
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

		const wasActive = isPartyActive(party.status);
		const willBeActive = isPartyActive(args.status);
		const playerCount = getPartyPlayerCount(party);
		const now = Date.now();
		await ctx.db.patch(args.partyId, {
			status: args.status,
			updatedAt: now,
		});

		if (wasActive !== willBeActive) {
			await applyPartyMetricsDelta(ctx, {
				activeParties: willBeActive ? 1 : -1,
				activePlayers: (willBeActive ? 1 : -1) * playerCount,
			});
		}

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

		const playerCount = getPartyPlayerCount(party);
		const isActive = isPartyActive(party.status);

		await ctx.db.delete(args.partyId);

		await applyPartyMetricsDelta(ctx, {
			totalParties: -1,
			totalPlayers: -playerCount,
			activeParties: isActive ? -1 : 0,
			activePlayers: isActive ? -playerCount : 0,
		});
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
				member.role !== "leader" &&
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

		const isActive = isPartyActive(party.status);
		await applyPartyMetricsDelta(ctx, {
			totalPlayers: -1,
			activePlayers: isActive ? -1 : 0,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});

export const backfillSearchAndMetrics = internalMutation({
	args: {},
	returns: partyMetricsSnapshotValidator,
	handler: async (ctx) => {
		const parties = await ctx.db.query("parties").collect();

		let activeParties = 0;
		let activePlayers = 0;
		let totalPlayers = 0;

		for (const party of parties) {
			const resolvedStatus = party.status ?? "open";
			const searchText = buildPartySearchText(party.name, party.description);
			const patch: Partial<Doc<"parties">> = {};

			if (party.status === undefined) {
				patch.status = resolvedStatus;
			}

			if (party.searchText !== searchText) {
				patch.searchText = searchText;
			}

			if (Object.keys(patch).length > 0) {
				await ctx.db.patch(party._id, patch);
			}

			const playerCount = getPartyPlayerCount(party);
			totalPlayers += playerCount;
			if (isPartyActive(resolvedStatus)) {
				activeParties += 1;
				activePlayers += playerCount;
			}
		}

		const snapshot = await setPartyMetricsSnapshot(ctx, {
			activeParties,
			activePlayers,
			totalParties: parties.length,
			totalPlayers,
		});

		return snapshot;
	},
});

export const backfillMemberRoles = internalMutation({
	args: {},
	returns: v.object({
		updatedParties: v.number(),
		leadersAdded: v.number(),
	}),
	handler: async (ctx) => {
		const parties = await ctx.db.query("parties").collect();
		let updatedParties = 0;
		let leadersAdded = 0;

		for (const party of parties) {
			let changed = false;
			const nextMembers = party.members.map((member) => {
				const resolvedRole = member.role ?? "member";
				if (resolvedRole !== member.role) {
					changed = true;
				}
				return {
					...member,
					role: resolvedRole,
				};
			});

			const hasLeader = nextMembers.some((member) => member.role === "leader");
			if (!hasLeader) {
				const owner = await ctx.db.get(party.ownerId);
				nextMembers.unshift({
					memberId: party.ownerId,
					playerAccountId: owner?.activePlayerAccountId ?? undefined,
					status: "accepted" as const,
					role: "leader" as const,
				});
				changed = true;
				leadersAdded += 1;
			}

			if (changed) {
				await ctx.db.patch(party._id, {
					members: nextMembers,
				});
				updatedParties += 1;
			}
		}

		return { updatedParties, leadersAdded };
	},
});
