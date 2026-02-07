import { api } from "../_generated/api";
import { describe, expect, it } from "vitest";
import {
	createAuthedUser,
	createConvexTest,
	identityFor,
} from "./setupConvexTest.helper";

describe("users integration", () => {
	it("getOrCreate creates exactly once for the same identity", async () => {
		const t = createConvexTest();
		const authed = t.withIdentity(identityFor("single-user"));

		const created = await authed.mutation(api.users.getOrCreate, {});
		const fetched = await authed.mutation(api.users.getOrCreate, {});

		expect(fetched._id).toBe(created._id);

		const users = await t.run((ctx) => ctx.db.query("users").collect());
		expect(users).toHaveLength(1);
		expect(users[0]?.tokenIdentifier).toBe(created.tokenIdentifier);
	});

	it("setActiveAccount blocks account switching while a party lock exists", async () => {
		const t = createConvexTest();
		const { authed } = await createAuthedUser(t, "party-locked-user");

		const firstAccount = await authed.mutation(api.playerAccounts.add, {
			username: "Account One",
		});
		const secondAccount = await authed.mutation(api.playerAccounts.add, {
			username: "Account Two",
		});

		await authed.mutation(api.users.setActiveAccount, {
			accountId: firstAccount._id,
		});

		await authed.mutation(api.parties.create, {
			name: "Locked Party",
			partySizeLimit: 5,
		});

		await expect(
			authed.mutation(api.users.setActiveAccount, {
				accountId: secondAccount._id,
			}),
		).rejects.toThrow("Cannot switch active account while you are in a party.");

		const currentUser = await authed.query(api.users.getCurrent, {});
		expect(currentUser?.activePlayerAccountId).toBe(firstAccount._id);
	});
});
