import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { api } from "@GroupScape/backend/convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useProfileAccountActions() {
	const addAccount = useMutation(api.playerAccounts.add);
	const deleteAccount = useMutation(api.playerAccounts.delete);
	const refreshStats = useAction(api.playerAccountStatsActions.refresh);

	const [username, setUsername] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<Id<"playerAccounts"> | null>(
		null,
	);
	const [refreshingStatsId, setRefreshingStatsId] =
		useState<Id<"playerAccounts"> | null>(null);

	const handleAddAccount = useCallback(
		async (event: FormEvent) => {
			event.preventDefault();
			const trimmedUsername = username.trim();
			if (!trimmedUsername) return;

			setIsSubmitting(true);
			try {
				await addAccount({ username: trimmedUsername });
				setUsername("");
				toast.success("Account linked");
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to link account";
				toast.error(message);
			} finally {
				setIsSubmitting(false);
			}
		},
		[addAccount, username],
	);

	const handleRefreshStats = useCallback(
		async (accountId: Id<"playerAccounts">) => {
			setRefreshingStatsId(accountId);
			try {
				await refreshStats({ accountId, force: true });
				toast.success("Hiscores refreshed");
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to refresh hiscores";
				toast.error(message);
			} finally {
				setRefreshingStatsId((prev) => (prev === accountId ? null : prev));
			}
		},
		[refreshStats],
	);

	const handleDeleteAccount = useCallback(
		async (accountId: Id<"playerAccounts">, accountName: string) => {
			const confirmed = window.confirm(
				`Remove ${accountName}? This cannot be undone.`,
			);
			if (!confirmed) return;

			setDeletingId(accountId);
			try {
				await deleteAccount({ accountId });
				toast.success("Account removed");
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to remove account";
				toast.error(message);
			} finally {
				setDeletingId(null);
			}
		},
		[deleteAccount],
	);

	return {
		username,
		setUsername,
		isSubmitting,
		deletingId,
		refreshingStatsId,
		handleAddAccount,
		handleDeleteAccount,
		handleRefreshStats,
	};
}

export type ProfileAccountActionsState = ReturnType<
	typeof useProfileAccountActions
>;
