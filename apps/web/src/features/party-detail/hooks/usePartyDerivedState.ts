import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useCallback, useMemo } from "react";
import type {
	AppUser,
	MemberProfile,
	PartyDoc,
	PartyMember,
	PartyStatus,
} from "../types";

type UsePartyDerivedStateArgs = {
	party: PartyDoc;
	appUser: AppUser | undefined;
	memberProfilesByAccountId: Map<Id<"playerAccounts">, MemberProfile>;
	areMemberProfilesLoading: boolean;
};

export type PartyDerivedState = {
	isOwner: boolean;
	memberEntry: PartyMember | undefined;
	memberStatus: PartyMember["status"] | undefined;
	leaderMember: PartyMember | null;
	leaderProfile: MemberProfile | undefined;
	acceptedMembers: PartyMember[];
	pendingMembers: PartyMember[];
	acceptedCount: number;
	pendingCount: number;
	openSlots: number;
	partyStatus: PartyStatus;
	approvalsBlockedReason: string | null;
	createdAt: number;
	updatedAt: number;
	areMemberProfilesLoading: boolean;
	getMemberProfile: (
		accountId?: Id<"playerAccounts">,
	) => MemberProfile | undefined;
};

export function usePartyDerivedState({
	party,
	appUser,
	memberProfilesByAccountId,
	areMemberProfilesLoading,
}: UsePartyDerivedStateArgs): PartyDerivedState {
	const isOwner = Boolean(party && appUser && party.ownerId === appUser._id);

	const memberEntry = useMemo(
		() =>
			appUser
				? party.members.find((member) => member.memberId === appUser._id)
				: undefined,
		[appUser, party.members],
	);

	const memberStatus = memberEntry?.status;
	const leaderEntry = useMemo(
		() => party.members.find((member) => member.role === "leader"),
		[party.members],
	);

	const acceptedMembers = useMemo(
		() =>
			party.members.filter(
				(member) => member.role !== "leader" && member.status === "accepted",
			),
		[party.members],
	);

	const pendingMembers = useMemo(
		() =>
			party.members.filter(
				(member) => member.role !== "leader" && member.status === "pending",
			),
		[party.members],
	);

	const leaderMember = useMemo<PartyMember | null>(() => {
		if (leaderEntry) return leaderEntry;
		return {
			memberId: party.ownerId,
			playerAccountId: undefined,
			status: "accepted",
			role: "leader",
		};
	}, [leaderEntry, party.ownerId]);

	const getMemberProfile = useCallback(
		(accountId?: Id<"playerAccounts">) =>
			accountId ? memberProfilesByAccountId.get(accountId) : undefined,
		[memberProfilesByAccountId],
	);

	const leaderProfile = leaderMember
		? getMemberProfile(leaderMember.playerAccountId)
		: undefined;

	const acceptedCount = acceptedMembers.length + 1;
	const pendingCount = pendingMembers.length;
	const openSlots = Math.max(0, party.partySizeLimit - acceptedCount);
	const partyStatus: PartyStatus = party.status === "closed" ? "closed" : "open";
	const approvalsBlockedReason =
		partyStatus === "closed"
			? "Party is closed. Reopen before approving new members."
			: openSlots <= 0
				? "Party is full. Reject a request to free up a slot."
				: null;
	const createdAt = party.createdAt ?? party._creationTime;
	const updatedAt = party.updatedAt ?? createdAt;

	return {
		isOwner,
		memberEntry,
		memberStatus,
		leaderMember,
		leaderProfile,
		acceptedMembers,
		pendingMembers,
		acceptedCount,
		pendingCount,
		openSlots,
		partyStatus,
		approvalsBlockedReason,
		createdAt,
		updatedAt,
		areMemberProfilesLoading,
		getMemberProfile,
	};
}
