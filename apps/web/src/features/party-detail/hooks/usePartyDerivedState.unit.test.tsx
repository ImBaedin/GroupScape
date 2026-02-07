import type {
	DataModel,
	Id,
} from "@GroupScape/backend/convex/_generated/dataModel";
import { renderHook } from "@testing-library/react";
import type { TableNamesInDataModel } from "convex/server";
import { describe, expect, it } from "vitest";
import type { AppUser, MemberProfile, PartyDoc } from "../types";
import { usePartyDerivedState } from "./usePartyDerivedState";

const asId = <T extends TableNamesInDataModel<DataModel>>(value: string) =>
	value as Id<T>;

describe("usePartyDerivedState", () => {
	it("derives owner/member counts, status, and approval blocking", () => {
		const ownerId = asId<"users">("owner-1");
		const acceptedAccountId = asId<"playerAccounts">("account-a");
		const pendingAccountId = asId<"playerAccounts">("account-b");
		const party: PartyDoc = {
			_id: asId<"parties">("party-1"),
			_creationTime: 100,
			ownerId,
			name: "Test Party",
			partySizeLimit: 2,
			status: "closed",
			createdAt: 111,
			updatedAt: 222,
			members: [
				{
					memberId: ownerId,
					playerAccountId: acceptedAccountId,
					status: "accepted",
					role: "leader",
				},
				{
					memberId: asId<"users">("member-2"),
					playerAccountId: acceptedAccountId,
					status: "accepted",
					role: "member",
				},
				{
					memberId: asId<"users">("member-3"),
					playerAccountId: pendingAccountId,
					status: "pending",
					role: "member",
				},
			],
		};
		const appUser: Exclude<AppUser, null> = {
			_id: ownerId,
			_creationTime: 1,
			tokenIdentifier: "token|owner-1",
			playerAccounts: [acceptedAccountId],
			activePlayerAccountId: acceptedAccountId,
		};
		const memberProfilesByAccountId = new Map<Id<"playerAccounts">, MemberProfile>([
			[
				acceptedAccountId,
				{
					accountId: acceptedAccountId,
					username: "Leader Account",
					headshotUrl: undefined,
					verificationStatus: "verified",
					summary: undefined,
					lastUpdated: undefined,
					isStale: true,
				},
			],
		]);

		const { result } = renderHook(() =>
			usePartyDerivedState({
				party,
				appUser,
				memberProfilesByAccountId,
				areMemberProfilesLoading: false,
			}),
		);

		expect(result.current.isOwner).toBe(true);
		expect(result.current.acceptedCount).toBe(2);
		expect(result.current.pendingCount).toBe(1);
		expect(result.current.openSlots).toBe(0);
		expect(result.current.partyStatus).toBe("closed");
		expect(result.current.approvalsBlockedReason).toBe(
			"Party is closed. Reopen before approving new members.",
		);
		expect(result.current.leaderProfile?.username).toBe("Leader Account");
	});

	it("creates a fallback leader entry when no explicit leader row exists", () => {
		const ownerId = asId<"users">("owner-2");
		const party: PartyDoc = {
			_id: asId<"parties">("party-2"),
			_creationTime: 100,
			ownerId,
			name: "Fallback Leader Party",
			partySizeLimit: 5,
			status: "open",
			createdAt: 111,
			updatedAt: 111,
			members: [
				{
					memberId: asId<"users">("member-4"),
					playerAccountId: undefined,
					status: "pending",
					role: "member",
				},
			],
		};

		const { result } = renderHook(() =>
			usePartyDerivedState({
				party,
				appUser: undefined,
				memberProfilesByAccountId: new Map(),
				areMemberProfilesLoading: true,
			}),
		);

		expect(result.current.leaderMember).toEqual({
			memberId: ownerId,
			playerAccountId: undefined,
			status: "accepted",
			role: "leader",
		});
		expect(result.current.getMemberProfile(undefined)).toBeUndefined();
	});
});
