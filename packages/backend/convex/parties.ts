import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

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

			const acceptedCount = party.members.filter(
				(entry) => entry.status === "accepted",
			).length;

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
