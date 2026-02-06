import { api } from "@GroupScape/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useMemo } from "react";
import type { VerificationStatus } from "../types";

export function useProfileQueries() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const user = useQuery(api.auth.getCurrentUser);
	const partyLock = useQuery(
		api.parties.getActiveForUser,
		isAuthenticated ? {} : "skip",
	);
	const accounts = useQuery(
		api.playerAccounts.list,
		isAuthenticated ? {} : undefined,
	);
	const accountStats = useQuery(
		api.playerAccountStats.listForUser,
		isAuthenticated ? {} : "skip",
	);

	const accountList = accounts ?? [];
	const accountIds = useMemo(
		() => accountList.map((account) => account._id),
		[accountList],
	);

	const memberProfiles = useQuery(
		api.playerAccounts.getMemberProfiles,
		isAuthenticated && accountIds.length > 0 ? { accountIds } : "skip",
	);

	const isAccountsLoading = isAuthenticated && accounts === undefined;

	const stats = useMemo(() => {
		if (isAccountsLoading) {
			return null;
		}
		const counts = {
			total: accountList.length,
			verified: 0,
			pending: 0,
		};
		for (const account of accountList) {
			const status = (account.verificationStatus ??
				"unverified") as VerificationStatus;
			if (status === "verified") counts.verified += 1;
			if (status === "pending") counts.pending += 1;
		}
		return counts;
	}, [accountList, isAccountsLoading]);

	const accountStatsMap = useMemo(
		() =>
			new Map((accountStats ?? []).map((entry) => [entry.accountId, entry])),
		[accountStats],
	);

	const headshotByAccountId = useMemo(
		() =>
			new Map(
				(memberProfiles ?? []).map((profile) => [
					profile.accountId,
					profile.headshotUrl ?? null,
				]),
			),
		[memberProfiles],
	);

	return {
		isAuthenticated,
		isLoading,
		user,
		partyLock,
		accounts,
		accountList,
		isAccountsLoading,
		stats,
		accountStatsMap,
		headshotByAccountId,
	};
}

export type ProfileQueriesState = ReturnType<typeof useProfileQueries>;
