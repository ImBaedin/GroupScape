import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type PartyMembershipCtx = MutationCtx | QueryCtx;

type PartyMembershipRole = "leader" | "member";
type PartyMembershipStatus = "accepted" | "pending";

export type UserPartyMembership = {
	partyId: Id<"parties">;
	partyName: string;
	partyStatus: Doc<"parties">["status"];
	role: PartyMembershipRole;
	membershipStatus: PartyMembershipStatus;
	playerAccountId?: Id<"playerAccounts">;
	sortValue: number;
};

const getPartySortValue = (party: Doc<"parties">) =>
	party.updatedAt ?? party.createdAt ?? party._creationTime;

const compareMemberships = (a: UserPartyMembership, b: UserPartyMembership) => {
	const aIsOpen = a.partyStatus !== "closed";
	const bIsOpen = b.partyStatus !== "closed";
	if (aIsOpen !== bIsOpen) {
		return aIsOpen ? -1 : 1;
	}

	if (a.membershipStatus !== b.membershipStatus) {
		return a.membershipStatus === "accepted" ? -1 : 1;
	}

	if (a.role !== b.role) {
		return a.role === "leader" ? -1 : 1;
	}

	return b.sortValue - a.sortValue;
};

export const getUserPartyMemberships = async (
	ctx: PartyMembershipCtx,
	userId: Id<"users">,
	options?: {
		excludePartyId?: Id<"parties">;
	},
): Promise<UserPartyMembership[]> => {
	const rows = await ctx.db
		.query("partyMemberships")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.collect();

	const memberships: UserPartyMembership[] = [];

	for (const row of rows) {
		if (options?.excludePartyId && row.partyId === options.excludePartyId) {
			continue;
		}

		const party = await ctx.db.get(row.partyId);
		if (!party) {
			continue;
		}

		memberships.push({
			partyId: row.partyId,
			partyName: party.name,
			partyStatus: party.status,
			role: row.role,
			membershipStatus: row.status,
			playerAccountId: row.playerAccountId,
			sortValue: getPartySortValue(party),
		});
	}

	return memberships.sort(compareMemberships);
};

export const getUserPartyLock = async (
	ctx: PartyMembershipCtx,
	userId: Id<"users">,
	options?: {
		excludePartyId?: Id<"parties">;
	},
): Promise<UserPartyMembership | null> => {
	const memberships = await getUserPartyMemberships(ctx, userId, options);
	return memberships[0] ?? null;
};

/** Call from mutations when adding a user to a party (create or requestJoin). */
export const insertPartyMembership = async (
	ctx: MutationCtx,
	args: {
		userId: Id<"users">;
		partyId: Id<"parties">;
		role: PartyMembershipRole;
		status: PartyMembershipStatus;
		playerAccountId?: Id<"playerAccounts">;
	},
) => {
	await ctx.db.insert("partyMemberships", {
		userId: args.userId,
		partyId: args.partyId,
		role: args.role,
		status: args.status,
		playerAccountId: args.playerAccountId,
	});
};

/** Call from mutations when a user leaves or is rejected. */
export const deletePartyMembershipByUserAndParty = async (
	ctx: MutationCtx,
	userId: Id<"users">,
	partyId: Id<"parties">,
) => {
	const doc = await ctx.db
		.query("partyMemberships")
		.withIndex("by_userId_partyId", (q) =>
			q.eq("userId", userId).eq("partyId", partyId),
		)
		.unique();
	if (doc) {
		await ctx.db.delete(doc._id);
	}
};

/** Call from mutations when a party is removed (delete all memberships for that party). */
export const deletePartyMembershipsByPartyId = async (
	ctx: MutationCtx,
	partyId: Id<"parties">,
) => {
	const docs = await ctx.db
		.query("partyMemberships")
		.withIndex("by_partyId", (q) => q.eq("partyId", partyId))
		.collect();
	for (const doc of docs) {
		await ctx.db.delete(doc._id);
	}
};

/** Call from mutations when a pending request is approved. */
export const setPartyMembershipStatus = async (
	ctx: MutationCtx,
	userId: Id<"users">,
	partyId: Id<"parties">,
	status: PartyMembershipStatus,
) => {
	const doc = await ctx.db
		.query("partyMemberships")
		.withIndex("by_userId_partyId", (q) =>
			q.eq("userId", userId).eq("partyId", partyId),
		)
		.unique();
	if (!doc) {
		throw new Error(
			`setPartyMembershipStatus: no party membership found for userId=${userId} partyId=${partyId}`,
		);
	}
	await ctx.db.patch(doc._id, { status });
};
