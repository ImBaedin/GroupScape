import {
	deletePartyMembershipByUserAndParty,
	getUserPartyLock,
	getUserPartyMemberships,
	insertPartyMembership,
	setPartyMembershipStatus,
} from "../lib/partyMembership";
import { describe, expect, it } from "vitest";
import { createConvexTest } from "./setupConvexTest.helper";

describe("partyMembership helper integration", () => {
	it("insertPartyMembership is idempotent and supports status transitions + delete", async () => {
		const t = createConvexTest();

		const { userId, partyId } = await t.run(async (ctx) => {
			const userId = await ctx.db.insert("users", {
				tokenIdentifier: "membership-helper-user",
				playerAccounts: [],
			});
			const partyId = await ctx.db.insert("parties", {
				ownerId: userId,
				members: [],
				name: "Helper Party",
				partySizeLimit: 5,
				status: "open",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
			return { userId, partyId };
		});

		await t.run(async (ctx) => {
			await insertPartyMembership(ctx, {
				userId,
				partyId,
				role: "member",
				status: "pending",
			});
			await insertPartyMembership(ctx, {
				userId,
				partyId,
				role: "member",
				status: "pending",
			});
		});

		const insertedRows = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", userId).eq("partyId", partyId),
				)
				.collect(),
		);
		expect(insertedRows).toHaveLength(1);
		expect(insertedRows[0]?.status).toBe("pending");

		await t.run(async (ctx) => {
			await setPartyMembershipStatus(ctx, userId, partyId, "accepted");
		});
		const acceptedRow = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", userId).eq("partyId", partyId),
				)
				.unique(),
		);
		expect(acceptedRow?.status).toBe("accepted");

		await t.run(async (ctx) => {
			await deletePartyMembershipByUserAndParty(ctx, userId, partyId);
		});
		const removedRow = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", userId).eq("partyId", partyId),
				)
				.unique(),
		);
		expect(removedRow).toBeNull();
	});

	it("getUserPartyLock sorts memberships and respects excludePartyId", async () => {
		const t = createConvexTest();

		const seeded = await t.run(async (ctx) => {
			const userId = await ctx.db.insert("users", {
				tokenIdentifier: "sort-user",
				playerAccounts: [],
			});
			const now = Date.now();

			const openAcceptedLeader = await ctx.db.insert("parties", {
				ownerId: userId,
				members: [],
				name: "Open Accepted Leader",
				partySizeLimit: 5,
				status: "open",
				createdAt: now - 1_000,
				updatedAt: now - 100,
			});
			const openPendingMember = await ctx.db.insert("parties", {
				ownerId: userId,
				members: [],
				name: "Open Pending Member",
				partySizeLimit: 5,
				status: "open",
				createdAt: now - 900,
				updatedAt: now - 90,
			});
			const closedAcceptedMember = await ctx.db.insert("parties", {
				ownerId: userId,
				members: [],
				name: "Closed Accepted Member",
				partySizeLimit: 5,
				status: "closed",
				createdAt: now - 800,
				updatedAt: now - 80,
			});

			await insertPartyMembership(ctx, {
				userId,
				partyId: openPendingMember,
				role: "member",
				status: "pending",
			});
			await insertPartyMembership(ctx, {
				userId,
				partyId: closedAcceptedMember,
				role: "member",
				status: "accepted",
			});
			await insertPartyMembership(ctx, {
				userId,
				partyId: openAcceptedLeader,
				role: "leader",
				status: "accepted",
			});

			return {
				userId,
				openAcceptedLeader,
				openPendingMember,
				closedAcceptedMember,
			};
		});

		const memberships = await t.run((ctx) =>
			getUserPartyMemberships(ctx, seeded.userId),
		);
		expect(memberships.map((membership) => membership.partyId)).toEqual([
			seeded.openAcceptedLeader,
			seeded.openPendingMember,
			seeded.closedAcceptedMember,
		]);

		const lock = await t.run((ctx) => getUserPartyLock(ctx, seeded.userId));
		expect(lock?.partyId).toBe(seeded.openAcceptedLeader);

		const lockExcludingFirst = await t.run((ctx) =>
			getUserPartyLock(ctx, seeded.userId, {
				excludePartyId: seeded.openAcceptedLeader,
			}),
		);
		expect(lockExcludingFirst?.partyId).toBe(seeded.openPendingMember);
	});
});
