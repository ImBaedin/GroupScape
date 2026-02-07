import { api } from "../_generated/api";
import { describe, expect, it } from "vitest";
import { createAuthedUser, createConvexTest } from "./setupConvexTest.helper";

const getMetrics = async (t: ReturnType<typeof createConvexTest>) =>
	t.run((ctx) =>
		ctx.db
			.query("partyMetrics")
			.withIndex("by_kind", (q) => q.eq("kind", "partyMetrics"))
			.unique(),
	);

describe("parties integration", () => {
	it("create adds the leader membership and increments metrics", async () => {
		const t = createConvexTest();
		const { authed, user } = await createAuthedUser(t, "leader-create");
		const leaderAccount = await authed.mutation(api.playerAccounts.add, {
			username: "Leader Account",
		});

		const partyId = await authed.mutation(api.parties.create, {
			name: "Bossing Party",
			description: "Bring gear",
			partySizeLimit: 5,
		});

		const party = await t.run((ctx) => ctx.db.get(partyId));
		expect(party).not.toBeNull();
		expect(party?.ownerId).toBe(user._id);
		expect(party?.members).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					memberId: user._id,
					playerAccountId: leaderAccount._id,
					role: "leader",
					status: "accepted",
				}),
			]),
		);

		const memberships = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_partyId", (q) => q.eq("partyId", partyId))
				.collect(),
		);
		expect(memberships).toHaveLength(1);
		expect(memberships[0]).toMatchObject({
			userId: user._id,
			partyId,
			role: "leader",
			status: "accepted",
			playerAccountId: leaderAccount._id,
		});

		const metrics = await getMetrics(t);
		expect(metrics).toMatchObject({
			activeParties: 1,
			activePlayers: 1,
			totalParties: 1,
			totalPlayers: 1,
		});
	});

	it("requestJoin creates a pending member and pending membership row", async () => {
		const t = createConvexTest();
		const { authed: ownerAuthed } = await createAuthedUser(t, "owner-request");
		const { authed: joinerAuthed, user: joinerUser } = await createAuthedUser(
			t,
			"joiner-request",
		);
		await ownerAuthed.mutation(api.playerAccounts.add, {
			username: "Owner Account",
		});
		const joinerAccount = await joinerAuthed.mutation(api.playerAccounts.add, {
			username: "Joiner Account",
		});
		const partyId = await ownerAuthed.mutation(api.parties.create, {
			name: "Joinable Party",
			partySizeLimit: 5,
		});

		const updatedParty = await joinerAuthed.mutation(api.parties.requestJoin, {
			partyId,
			playerAccountId: joinerAccount._id,
		});

		expect(updatedParty.members).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					memberId: joinerUser._id,
					playerAccountId: joinerAccount._id,
					role: "member",
					status: "pending",
				}),
			]),
		);

		const membership = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", joinerUser._id).eq("partyId", partyId),
				)
				.unique(),
		);
		expect(membership).toMatchObject({
			userId: joinerUser._id,
			partyId,
			role: "member",
			status: "pending",
			playerAccountId: joinerAccount._id,
		});
	});

	it("reviewRequest approve updates party + membership to accepted", async () => {
		const t = createConvexTest();
		const { authed: ownerAuthed } = await createAuthedUser(t, "owner-approve");
		const { authed: joinerAuthed, user: joinerUser } = await createAuthedUser(
			t,
			"joiner-approve",
		);
		await ownerAuthed.mutation(api.playerAccounts.add, {
			username: "Owner Account",
		});
		const joinerAccount = await joinerAuthed.mutation(api.playerAccounts.add, {
			username: "Joiner Account",
		});
		const partyId = await ownerAuthed.mutation(api.parties.create, {
			name: "Approval Party",
			partySizeLimit: 5,
		});
		await joinerAuthed.mutation(api.parties.requestJoin, {
			partyId,
			playerAccountId: joinerAccount._id,
		});

		const reviewed = await ownerAuthed.mutation(api.parties.reviewRequest, {
			partyId,
			memberId: joinerUser._id,
			playerAccountId: joinerAccount._id,
			approve: true,
		});

		const approved = reviewed.members.find(
			(member) =>
				member.memberId === joinerUser._id &&
				member.playerAccountId === joinerAccount._id,
		);
		expect(approved?.status).toBe("accepted");

		const membership = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", joinerUser._id).eq("partyId", partyId),
				)
				.unique(),
		);
		expect(membership?.status).toBe("accepted");

		const metrics = await getMetrics(t);
		expect(metrics).toMatchObject({
			activeParties: 1,
			activePlayers: 2,
			totalParties: 1,
			totalPlayers: 2,
		});
	});

	it("reviewRequest reject removes pending member + membership row", async () => {
		const t = createConvexTest();
		const { authed: ownerAuthed } = await createAuthedUser(t, "owner-reject");
		const { authed: joinerAuthed, user: joinerUser } = await createAuthedUser(
			t,
			"joiner-reject",
		);
		await ownerAuthed.mutation(api.playerAccounts.add, {
			username: "Owner Account",
		});
		const joinerAccount = await joinerAuthed.mutation(api.playerAccounts.add, {
			username: "Joiner Account",
		});
		const partyId = await ownerAuthed.mutation(api.parties.create, {
			name: "Reject Party",
			partySizeLimit: 5,
		});
		await joinerAuthed.mutation(api.parties.requestJoin, {
			partyId,
			playerAccountId: joinerAccount._id,
		});

		const reviewed = await ownerAuthed.mutation(api.parties.reviewRequest, {
			partyId,
			memberId: joinerUser._id,
			playerAccountId: joinerAccount._id,
			approve: false,
		});

		const remaining = reviewed.members.find(
			(member) =>
				member.memberId === joinerUser._id &&
				member.playerAccountId === joinerAccount._id,
		);
		expect(remaining).toBeUndefined();

		const membership = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_userId_partyId", (q) =>
					q.eq("userId", joinerUser._id).eq("partyId", partyId),
				)
				.unique(),
		);
		expect(membership).toBeNull();
	});

	it("updateStatus transitions between open and closed while updating metrics", async () => {
		const t = createConvexTest();
		const { authed } = await createAuthedUser(t, "owner-status");
		await authed.mutation(api.playerAccounts.add, {
			username: "Owner Account",
		});
		const partyId = await authed.mutation(api.parties.create, {
			name: "Status Party",
			partySizeLimit: 5,
		});

		await authed.mutation(api.parties.updateStatus, {
			partyId,
			status: "closed",
		});
		const afterClosed = await getMetrics(t);
		expect(afterClosed).toMatchObject({
			activeParties: 0,
			activePlayers: 0,
			totalParties: 1,
			totalPlayers: 1,
		});

		await authed.mutation(api.parties.updateStatus, {
			partyId,
			status: "open",
		});
		const afterOpen = await getMetrics(t);
		expect(afterOpen).toMatchObject({
			activeParties: 1,
			activePlayers: 1,
		});
	});

	it("remove cleans up memberships and decrements active metrics", async () => {
		const t = createConvexTest();
		const { authed: ownerAuthed } = await createAuthedUser(t, "owner-remove");
		const { authed: joinerAuthed } = await createAuthedUser(t, "joiner-remove");
		await ownerAuthed.mutation(api.playerAccounts.add, {
			username: "Owner Account",
		});
		const joinerAccount = await joinerAuthed.mutation(api.playerAccounts.add, {
			username: "Joiner Account",
		});

		const partyId = await ownerAuthed.mutation(api.parties.create, {
			name: "Remove Party",
			partySizeLimit: 5,
		});
		await joinerAuthed.mutation(api.parties.requestJoin, {
			partyId,
			playerAccountId: joinerAccount._id,
		});

		await ownerAuthed.mutation(api.parties.remove, { partyId });

		const party = await t.run((ctx) => ctx.db.get(partyId));
		expect(party).toBeNull();

		const memberships = await t.run((ctx) =>
			ctx.db
				.query("partyMemberships")
				.withIndex("by_partyId", (q) => q.eq("partyId", partyId))
				.collect(),
		);
		expect(memberships).toHaveLength(0);

		const metrics = await getMetrics(t);
		expect(metrics).toMatchObject({
			activeParties: 0,
			activePlayers: 0,
			totalParties: 1,
			totalPlayers: 1,
		});
	});
});
