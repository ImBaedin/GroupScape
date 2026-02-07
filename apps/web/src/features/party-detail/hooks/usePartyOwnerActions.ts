import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import type { PartyMember, PartyStatus } from "../types";

type UsePartyOwnerActionsArgs = {
	partyId: Id<"parties">;
};

type PartyOwnerActionResult =
	| { ok: true }
	| {
			ok: false;
			error: string;
	  };

export function usePartyOwnerActions({ partyId }: UsePartyOwnerActionsArgs) {
	const reviewRequest = useMutation(api.parties.reviewRequest);
	const updateStatus = useMutation(api.parties.updateStatus);
	const removeParty = useMutation(api.parties.remove);
	const kickMember = useMutation(api.parties.kickMember);

	const handleStatusChange = async (
		nextStatus: PartyStatus,
	): Promise<PartyOwnerActionResult> => {
		try {
			await updateStatus({ partyId, status: nextStatus });
			toast.success(nextStatus === "open" ? "Party reopened" : "Party closed");
			return { ok: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to update status";
			toast.error(message);
			return { ok: false, error: message };
		}
	};

	const handleCloseParty = async (): Promise<PartyOwnerActionResult> => {
		try {
			await removeParty({ partyId });
			toast.success("Party closed");
			return { ok: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to close party";
			toast.error(message);
			return { ok: false, error: message };
		}
	};

	const handleReviewRequest = async (
		member: PartyMember,
		approve: boolean,
	): Promise<PartyOwnerActionResult> => {
		if (!member.playerAccountId) {
			const message = "Missing player account for this member.";
			toast.error(message);
			return { ok: false, error: message };
		}
		try {
			await reviewRequest({
				partyId,
				memberId: member.memberId,
				playerAccountId: member.playerAccountId,
				approve,
			});
			toast.success(approve ? "Request approved" : "Request declined");
		} catch (error) {
			const message =
				error instanceof ConvexError &&
				typeof error.data === "object" &&
				error.data !== null &&
				"message" in error.data
					? (error.data as { message: string }).message
					: error instanceof Error
						? error.message
						: "Unable to review request";
			toast.error(message);
			return { ok: false, error: message };
		}
		return { ok: true };
	};

	const handleKickMember = async (
		member: PartyMember,
	): Promise<PartyOwnerActionResult> => {
		try {
			await kickMember({
				partyId,
				memberId: member.memberId,
			});
			toast.success("Member removed");
			return { ok: true };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to remove member";
			toast.error(message);
			return { ok: false, error: message };
		}
	};

	return {
		handleStatusChange,
		handleCloseParty,
		handleReviewRequest,
		handleKickMember,
	};
}
