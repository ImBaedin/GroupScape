import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

type SavePartyDetailsInput = {
	draftName: string;
	draftDescription: string;
};

type SavePartyDetailsResult =
	| { ok: true }
	| {
			ok: false;
			error: string;
	  };

type UsePartyDetailsEditorArgs = {
	partyId: Id<"parties">;
};

export function usePartyDetailsEditor({
	partyId,
}: UsePartyDetailsEditorArgs) {
	const updateDetails = useMutation(api.parties.updateDetails);

	const saveDetails = async ({
		draftName,
		draftDescription,
	}: SavePartyDetailsInput): Promise<SavePartyDetailsResult> => {
		const trimmedName = draftName.trim();
		if (!trimmedName) {
			return { ok: false, error: "Party name cannot be empty." };
		}

		try {
			await updateDetails({
				partyId,
				name: trimmedName,
				description: draftDescription.trim() || undefined,
			});
			toast.success("Party details updated");
			return { ok: true };
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unable to update party details";
			toast.error(message);
			return { ok: false, error: message };
		}
	};

	return {
		saveDetails,
	};
}
