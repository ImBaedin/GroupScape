import { api } from "../_generated/api";
import { describe, expect, it } from "vitest";
import { createAuthedUser, createConvexTest } from "./setupConvexTest.helper";

describe("playerAccounts integration", () => {
	it("getMemberProfiles deduplicates account IDs and omits missing accounts", async () => {
		const t = createConvexTest();
		const { authed, user } = await createAuthedUser(t, "profiles-user");

		const firstAccount = await authed.mutation(api.playerAccounts.add, {
			username: "First Account",
		});
		const secondAccount = await authed.mutation(api.playerAccounts.add, {
			username: "Second Account",
		});

		const missingAccountId = await t.run(async (ctx) => {
			const id = await ctx.db.insert("playerAccounts", {
				userId: user._id,
				username: "Removed Account",
				verificationStatus: "unverified",
			});
			await ctx.db.delete(id);
			return id;
		});

		const profiles = await authed.query(api.playerAccounts.getMemberProfiles, {
			accountIds: [
				firstAccount._id,
				firstAccount._id,
				missingAccountId,
				secondAccount._id,
				secondAccount._id,
			],
		});

		expect(profiles).toHaveLength(2);
		expect(profiles.map((profile) => profile.accountId)).toEqual([
			firstAccount._id,
			secondAccount._id,
		]);
		expect(profiles.every((profile) => profile.isStale === true)).toBe(true);
	});
});
