import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

type UsePartyMembershipActionsArgs = {
	partyId: Id<"parties">;
};

type PartyMembershipActionResult =
	| { ok: true }
	| {
			ok: false;
			error: string;
	  };

export function usePartyMembershipActions({
	partyId,
}: UsePartyMembershipActionsArgs) {
	const leaveParty = useMutation(api.parties.leave);

	const handleLeaveParty = async (
		playerAccountId?: Id<"playerAccounts">,
	): Promise<PartyMembershipActionResult> => {
		try {
			await leaveParty({ partyId, playerAccountId });
			toast.success("Left party");
			return { ok: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to leave party";
			toast.error(message);
			return { ok: false, error: message };
		}
	};

	return {
		handleLeaveParty,
	};
}
