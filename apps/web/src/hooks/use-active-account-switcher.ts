import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type UseActiveAccountSwitcherOptions = {
	activeAccountId: Id<"playerAccounts"> | null;
	isPartyLocked: boolean;
};

export function useActiveAccountSwitcher({
	activeAccountId,
	isPartyLocked,
}: UseActiveAccountSwitcherOptions) {
	const setActiveAccount = useMutation(api.users.setActiveAccount);
	const [activeUpdatingId, setActiveUpdatingId] =
		useState<Id<"playerAccounts"> | null>(null);

	const handleSetActiveAccount = useCallback(
		async (accountId: Id<"playerAccounts">) => {
			if (activeAccountId === accountId) return;
			if (isPartyLocked) {
				toast.error(
					"Leave or resolve your current party before switching account.",
				);
				return;
			}
			setActiveUpdatingId(accountId);
			try {
				await setActiveAccount({ accountId });
				toast.success("Active account updated");
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Unable to update active account";
				toast.error(message);
			} finally {
				setActiveUpdatingId((prev) => (prev === accountId ? null : prev));
			}
		},
		[activeAccountId, isPartyLocked, setActiveAccount],
	);

	return {
		activeUpdatingId,
		handleSetActiveAccount,
	};
}
