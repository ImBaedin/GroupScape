import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { requireUser } from "./lib/auth";
import {
	deletePartyMembershipByUserAndParty,
	deletePartyMembershipsByPartyId,
	getUserPartyLock,
	insertPartyMembership,
	setPartyMembershipStatus,
} from "./lib/partyMembership";

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
	value.toLowerCase().replace(/\s+/g, " ").trim();

const buildPartySearchText = (name: string, description?: string) => {
	const parts = [name, description]
		.map((value) => value?.trim())
		.filter((value): value is string => Boolean(value && value.length > 0));
	return normalizeSearchText(parts.join(" "));
};

const isPartyActive = (status: Doc<"parties">["status"]) => status !== "closed";

const getPartyAcceptedPlayerCount = (party: Doc<"parties">) => {
	const hasLeader = party.members.some((member) => member.role === "leader");
	const acceptedMembers = party.members.filter(
		(member) => member.role !== "leader" && member.status === "accepted",
	).length;
	return acceptedMembers + (hasLeader ? 1 : 0);
};

const buildLockedPartyMessage = (
	partyName: string,
	membershipStatus: "accepted" | "pending",
) =>
	membershipStatus === "pending"
		? `You already have a pending request in "${partyName}". Resolve it before joining another party.`
		: `You are already in "${partyName}". Leave it before joining another party.`;

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
		totalParties: Math.max(0, metrics.totalParties + (delta.totalParties ?? 0)),
		totalPlayers: Math.max(0, metrics.totalPlayers + (delta.totalPlayers ?? 0)),
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
	membershipRole: partyMemberRoleValidator,
	membershipStatus: memberStatusValidator,
	playerAccountId: v.optional(v.id("playerAccounts")),
	createdAt: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
});

export const getActiveForUser = query({
	args: {},
	returns: v.union(activePartyValidator, v.null()),
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const lock = await getUserPartyLock(ctx, user._id);
		if (!lock) {
			return null;
		}

		const active = await ctx.db.get(lock.partyId);
		if (!active) {
			return null;
		}

		return {
			_id: active._id,
			_creationTime: active._creationTime,
			name: active.name,
			status: active.status,
			membershipRole: lock.role,
			membershipStatus: lock.membershipStatus,
			playerAccountId: lock.playerAccountId,
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
		const party = await ctx.db.get(args.partyId);
		if (!party) {
			return null;
		}

		const pendingMembers = party.members.filter(
			(member) => member.role !== "leader" && member.status === "pending",
		);

		if (pendingMembers.length === 0) {
			return party;
		}

		const accountIds = pendingMembers
			.map((member) => member.playerAccountId)
			.filter((accountId): accountId is Doc<"playerAccounts">["_id"] =>
				Boolean(accountId),
			);

		if (accountIds.length === 0) {
			return party;
		}

		const accounts = await Promise.all(
			accountIds.map((accountId) => ctx.db.get(accountId)),
		);
		const verificationStatusById = new Map(
			accountIds.map((accountId, index) => [
				accountId,
				accounts[index]?.verificationStatus ?? "unverified",
			]),
		);

		const priorityForStatus = (
			status?: Doc<"playerAccounts">["verificationStatus"],
		) => {
			switch (status) {
				case "verified":
					return 0;
				case "pending":
					return 1;
				case "unverified":
				default:
					return 2;
			}
		};

		const sortedPending = pendingMembers
			.map((member, index) => ({
				member,
				index,
				priority: priorityForStatus(
					member.playerAccountId
						? verificationStatusById.get(member.playerAccountId)
						: "unverified",
				),
			}))
			.sort((a, b) =>
				a.priority === b.priority ? a.index - b.index : a.priority - b.priority,
			)
			.map(({ member }) => member);

		let pendingIndex = 0;
		const nextMembers = party.members.map((member) =>
			member.role !== "leader" && member.status === "pending"
				? sortedPending[pendingIndex++]
				: member,
		);

		return {
			...party,
			members: nextMembers,
		};
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
		const partyLock = await getUserPartyLock(ctx, user._id);
		if (partyLock) {
			throw new ConvexError(
				buildLockedPartyMessage(
					partyLock.partyName,
					partyLock.membershipStatus,
				),
			);
		}

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

		await insertPartyMembership(ctx, {
			userId: user._id,
			partyId,
			role: "leader",
			status: "accepted",
			playerAccountId: user.activePlayerAccountId ?? undefined,
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

		const partyLock = await getUserPartyLock(ctx, user._id, {
			excludePartyId: args.partyId,
		});
		if (partyLock) {
			throw new ConvexError(
				buildLockedPartyMessage(
					partyLock.partyName,
					partyLock.membershipStatus,
				),
			);
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

		await insertPartyMembership(ctx, {
			userId: user._id,
			partyId: args.partyId,
			role: "member",
			status: "pending",
			playerAccountId: args.playerAccountId,
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

			const partyLock = await getUserPartyLock(ctx, args.memberId, {
				excludePartyId: args.partyId,
			});
			if (partyLock) {
				throw new ConvexError(
					buildLockedPartyMessage(
						partyLock.partyName,
						partyLock.membershipStatus,
					),
				);
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

		if (args.approve) {
			await setPartyMembershipStatus(
				ctx,
				args.memberId,
				args.partyId,
				"accepted",
			);
			await applyPartyMetricsDelta(ctx, {
				totalPlayers: 1,
				activePlayers: isActive ? 1 : 0,
			});
		} else {
			await deletePartyMembershipByUserAndParty(
				ctx,
				args.memberId,
				args.partyId,
			);
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
			description:
				trimmedDescription && trimmedDescription.length > 0
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
		const playerCount = getPartyAcceptedPlayerCount(party);
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

		const playerCount = getPartyAcceptedPlayerCount(party);
		const isActive = isPartyActive(party.status);

		await deletePartyMembershipsByPartyId(ctx, args.partyId);
		await ctx.db.delete(args.partyId);

		await applyPartyMetricsDelta(ctx, {
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

		const leavingMember = party.members[memberIndex];
		const now = Date.now();
		const nextMembers = party.members.filter(
			(_, index) => index !== memberIndex,
		);

		await ctx.db.patch(args.partyId, {
			members: nextMembers,
			updatedAt: now,
		});

		await deletePartyMembershipByUserAndParty(ctx, user._id, args.partyId);

		const isActive = isPartyActive(party.status);
		await applyPartyMetricsDelta(ctx, {
			activePlayers: isActive && leavingMember.status === "accepted" ? -1 : 0,
		});

		const updated = await ctx.db.get(args.partyId);
		if (!updated) {
			throw new ConvexError("Party not found");
		}

		return updated;
	},
});

const usersInMultiplePartiesValidator = v.object({
	userId: v.id("users"),
	partyIds: v.array(v.id("parties")),
});

const usersWithMultipleAccountsInPartyValidator = v.object({
	userId: v.id("users"),
	partyId: v.id("parties"),
	accountIds: v.array(v.id("playerAccounts")),
});

export const auditMembershipConflicts = internalQuery({
	args: {},
	returns: v.object({
		generatedAt: v.number(),
		usersInMultipleParties: v.array(usersInMultiplePartiesValidator),
		usersWithMultipleAccountsInParty: v.array(
			usersWithMultipleAccountsInPartyValidator,
		),
	}),
	handler: async (ctx) => {
		const parties = await ctx.db.query("parties").collect();
		const userPartyIds = new Map<
			Doc<"users">["_id"],
			Set<Doc<"parties">["_id"]>
		>();
		const partyUserAccounts = new Map<
			string,
			Set<Doc<"playerAccounts">["_id"]>
		>();

		for (const party of parties) {
			for (const member of party.members) {
				const partiesForUser =
					userPartyIds.get(member.memberId) ?? new Set<Doc<"parties">["_id"]>();
				partiesForUser.add(party._id);
				userPartyIds.set(member.memberId, partiesForUser);

				if (!member.playerAccountId) {
					continue;
				}

				const key = `${party._id}:${member.memberId}`;
				const accountIds =
					partyUserAccounts.get(key) ?? new Set<Doc<"playerAccounts">["_id"]>();
				accountIds.add(member.playerAccountId);
				partyUserAccounts.set(key, accountIds);
			}

			const leaderEntry = party.members.find(
				(member) =>
					member.role === "leader" && member.memberId === party.ownerId,
			);
			const ownerParties =
				userPartyIds.get(party.ownerId) ?? new Set<Doc<"parties">["_id"]>();
			ownerParties.add(party._id);
			userPartyIds.set(party.ownerId, ownerParties);

			if (leaderEntry?.playerAccountId) {
				const key = `${party._id}:${party.ownerId}`;
				const accountIds =
					partyUserAccounts.get(key) ?? new Set<Doc<"playerAccounts">["_id"]>();
				accountIds.add(leaderEntry.playerAccountId);
				partyUserAccounts.set(key, accountIds);
			}
		}

		const usersInMultipleParties = Array.from(userPartyIds.entries())
			.filter(([, partyIds]) => partyIds.size > 1)
			.map(([userId, partyIds]) => ({
				userId,
				partyIds: Array.from(partyIds),
			}));

		const usersWithMultipleAccountsInParty = Array.from(
			partyUserAccounts.entries(),
		)
			.filter(([, accountIds]) => accountIds.size > 1)
			.map(([key, accountIds]) => {
				const [partyId, userId] = key.split(":");
				return {
					userId: userId as Doc<"users">["_id"],
					partyId: partyId as Doc<"parties">["_id"],
					accountIds: Array.from(accountIds),
				};
			});

		return {
			generatedAt: Date.now(),
			usersInMultipleParties,
			usersWithMultipleAccountsInParty,
		};
	},
});

export const backfillSearchAndMetrics = internalMutation({
	args: {},
	returns: partyMetricsSnapshotValidator,
	handler: async (ctx) => {
		const existingMetrics = await getPartyMetricsDoc(ctx);
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

			const playerCount = getPartyAcceptedPlayerCount(party);
			totalPlayers += playerCount;
			if (isPartyActive(resolvedStatus)) {
				activeParties += 1;
				activePlayers += playerCount;
			}
		}

		const snapshot = await setPartyMetricsSnapshot(ctx, {
			activeParties,
			activePlayers,
			totalParties: existingMetrics?.totalParties ?? parties.length,
			totalPlayers: existingMetrics?.totalPlayers ?? totalPlayers,
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

/** One-time backfill: populate partyMemberships from existing parties.members. Run once after adding the partyMemberships table. */
export const backfillPartyMemberships = internalMutation({
	args: {},
	returns: v.object({ inserted: v.number() }),
	handler: async (ctx) => {
		const parties = await ctx.db.query("parties").collect();
		let inserted = 0;

		for (const party of parties) {
			const leaderEntry = party.members.find(
				(m) => m.role === "leader" && m.memberId === party.ownerId,
			);
			const existingLeader = await ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", party.ownerId).eq("partyId", party._id),
				)
				.unique();
			if (!existingLeader) {
				await ctx.db.insert("partyMemberships", {
					userId: party.ownerId,
					partyId: party._id,
					role: "leader",
					status: "accepted",
					playerAccountId: leaderEntry?.playerAccountId,
				});
				inserted++;
			}

			for (const member of party.members) {
				const role = member.role ?? "member";
				if (role === "leader") continue;

				const existing = await ctx.db
					.query("partyMemberships")
					.withIndex("by_userId_partyId", (q) =>
						q.eq("userId", member.memberId).eq("partyId", party._id),
					)
					.unique();
				if (!existing) {
					await ctx.db.insert("partyMemberships", {
						userId: member.memberId,
						partyId: party._id,
						role: "member",
						status: member.status,
						playerAccountId: member.playerAccountId,
					});
					inserted++;
				}
			}
		}

		return { inserted };
	},
});
