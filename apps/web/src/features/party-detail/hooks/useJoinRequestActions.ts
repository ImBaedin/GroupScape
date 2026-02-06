import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useMemo } from "react";
import { toast } from "sonner";
import type {
	AppUser,
	PartyDoc,
	PartyLock,
	PartyMember,
	PartyStatus,
	PlayerAccount,
} from "../types";

type UseJoinRequestActionsArgs = {
	isAuthenticated: boolean;
	party: PartyDoc;
	partyLock: PartyLock | undefined;
	accountList: PlayerAccount[];
	appUser: AppUser | undefined;
	isOwner: boolean;
	memberEntry: PartyMember | undefined;
	openSlots: number;
	partyStatus: PartyStatus;
	selectedAccountOverrideId: Id<"playerAccounts"> | null;
};

type JoinRequestResult =
	| { ok: true }
	| {
			ok: false;
			error: string;
	  };

export function useJoinRequestActions({
	isAuthenticated,
	party,
	partyLock,
	accountList,
	appUser,
	isOwner,
	memberEntry,
	openSlots,
	partyStatus,
	selectedAccountOverrideId,
}: UseJoinRequestActionsArgs) {
	const requestJoin = useMutation(api.parties.requestJoin);

	const selectedAccountId = useMemo(() => {
		if (
			selectedAccountOverrideId &&
			accountList.some((account) => account._id === selectedAccountOverrideId)
		) {
			return selectedAccountOverrideId;
		}
		const activeAccountId = appUser?.activePlayerAccountId;
		if (
			activeAccountId &&
			accountList.some((account) => account._id === activeAccountId)
		) {
			return activeAccountId;
		}
		return accountList[0]?._id ?? null;
	}, [accountList, appUser?.activePlayerAccountId, selectedAccountOverrideId]);

	const selectedAccount = accountList.find(
		(account) => account._id === selectedAccountId,
	);
	const selectedStatus = selectedAccount?.verificationStatus ?? "unverified";
	const memberStatus = memberEntry?.status;

	const isVerified = selectedStatus === "verified";
	const isLockedToDifferentParty = Boolean(partyLock && partyLock._id !== party._id);
	const canRequest =
		Boolean(selectedAccount && isAuthenticated) &&
		partyStatus !== "closed" &&
		!memberEntry &&
		!isOwner &&
		!isLockedToDifferentParty &&
		openSlots > 0;

	const helperMessage = (() => {
		if (!isAuthenticated) {
			return "Sign in to request an invite.";
		}
		if (!selectedAccount) {
			return "Select an account to request a seat.";
		}
		if (isOwner) {
			return "You lead this party.";
		}
		if (memberStatus === "accepted") {
			return "You are already in this party.";
		}
		if (memberStatus === "pending") {
			return "Your request is pending leader approval.";
		}
		if (isLockedToDifferentParty && partyLock) {
			return partyLock.membershipStatus === "pending"
				? `You already have a pending request in "${partyLock.name}".`
				: `You are already in "${partyLock.name}". Leave it before joining another party.`;
		}
		if (partyStatus === "closed") {
			return "This party is closed for new invites.";
		}
		if (!isOwner && openSlots === 0) {
			return "This party is currently full.";
		}
		if (!isOwner && !isVerified) {
			return "Unverified requests are reviewed after verified accounts.";
		}
		return "Send a join request to the party leader.";
	})();

	const handleRequestJoin = async (): Promise<JoinRequestResult> => {
		if (!selectedAccountId) {
			return { ok: false, error: "Select an account to request a seat." };
		}
		if (isLockedToDifferentParty && partyLock) {
			const message =
				partyLock.membershipStatus === "pending"
					? `You already have a pending request in "${partyLock.name}".`
					: `You are already in "${partyLock.name}". Leave it before joining another party.`;
			toast.error(message);
			return { ok: false, error: message };
		}
		try {
			await requestJoin({
				partyId: party._id,
				playerAccountId: selectedAccountId,
			});
			toast.success("Join request sent");
			return { ok: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to request to join";
			toast.error(message);
			return { ok: false, error: message };
		}
	};

	return {
		selectedAccountId,
		memberStatus,
		canRequest,
		helperMessage,
		handleRequestJoin,
	};
}
