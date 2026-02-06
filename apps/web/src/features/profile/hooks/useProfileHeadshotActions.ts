import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useProfileHeadshotActions() {
	const saveHeadshot = useAction(api.headshots.saveHeadshot);

	const [headshotEditingId, setHeadshotEditingId] =
		useState<Id<"playerAccounts"> | null>(null);
	const [headshotSavingId, setHeadshotSavingId] =
		useState<Id<"playerAccounts"> | null>(null);
	const [headshotErrors, setHeadshotErrors] = useState<
		Record<string, string | undefined>
	>({});

	const toggleHeadshotEditing = useCallback((accountId: Id<"playerAccounts">) => {
		setHeadshotEditingId((prev) => (prev === accountId ? null : accountId));
	}, []);

	const handleHeadshotCapture = useCallback(
		async (accountId: Id<"playerAccounts">, imageData: string) => {
			if (headshotSavingId === accountId) return;
			setHeadshotSavingId(accountId);
			setHeadshotErrors((prev) => ({ ...prev, [accountId]: undefined }));
			try {
				await saveHeadshot({ accountId, imageData });
				toast.success("Headshot saved");
				setHeadshotEditingId(null);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unable to save headshot";
				setHeadshotErrors((prev) => ({ ...prev, [accountId]: message }));
				toast.error(message);
			} finally {
				setHeadshotSavingId((prev) => (prev === accountId ? null : prev));
			}
		},
		[headshotSavingId, saveHeadshot],
	);

	return {
		headshotEditingId,
		headshotSavingId,
		headshotErrors,
		toggleHeadshotEditing,
		handleHeadshotCapture,
	};
}

export type ProfileHeadshotActionsState = ReturnType<
	typeof useProfileHeadshotActions
>;
