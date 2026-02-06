import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
	VerificationState,
	VerificationStateByAccountId,
} from "../types";

export function useProfileVerificationActions() {
	const cancelVerification = useMutation(api.playerAccounts.cancelVerification);
	const startVerification = useAction(api.verification.start);
	const verifyAccount = useAction(api.verification.verify);
	const [verificationState, setVerificationState] =
		useState<VerificationStateByAccountId>({});

	const updateVerificationState = useCallback(
		(
			accountId: Id<"playerAccounts">,
			updates: Partial<VerificationState>,
		) => {
			setVerificationState((prev) => ({
				...prev,
				[accountId]: {
					...prev[accountId],
					...updates,
				},
			}));
		},
		[],
	);

	const handleStartVerification = useCallback(
		async (accountId: Id<"playerAccounts">) => {
			updateVerificationState(accountId, {
				isStarting: true,
				error: undefined,
				result: undefined,
			});
			try {
				const response = await startVerification({ accountId });
				updateVerificationState(accountId, {
					instructions: response.instructions,
					challenge: response.challenge,
				});
				toast.success("Verification task ready");
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Unable to start verification";
				updateVerificationState(accountId, { error: message });
				toast.error(message);
			} finally {
				updateVerificationState(accountId, { isStarting: false });
			}
		},
		[startVerification, updateVerificationState],
	);

	const handleVerifyAccount = useCallback(
		async (accountId: Id<"playerAccounts">) => {
			updateVerificationState(accountId, {
				isVerifying: true,
				error: undefined,
			});
			try {
				const result = await verifyAccount({ accountId });
				updateVerificationState(accountId, { result });
				if (result.status === "verified") {
					toast.success("Account verified");
				} else if (result.status === "expired") {
					toast.warning("Verification challenge expired");
				} else {
					toast.info("Hiscores not updated yet. Try again soon.");
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unable to verify account";
				updateVerificationState(accountId, { error: message });
				toast.error(message);
			} finally {
				updateVerificationState(accountId, { isVerifying: false });
			}
		},
		[updateVerificationState, verifyAccount],
	);

	const handleCancelVerification = useCallback(
		async (accountId: Id<"playerAccounts">) => {
			updateVerificationState(accountId, {
				isCanceling: true,
				error: undefined,
			});
			try {
				await cancelVerification({ accountId });
				updateVerificationState(accountId, {
					instructions: undefined,
					challenge: undefined,
					result: undefined,
				});
				toast.success("Verification canceled");
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Unable to cancel verification";
				updateVerificationState(accountId, { error: message });
				toast.error(message);
			} finally {
				updateVerificationState(accountId, { isCanceling: false });
			}
		},
		[cancelVerification, updateVerificationState],
	);

	return {
		verificationState,
		handleStartVerification,
		handleVerifyAccount,
		handleCancelVerification,
	};
}

export type ProfileVerificationActionsState = ReturnType<
	typeof useProfileVerificationActions
>;
