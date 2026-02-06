import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { useMemo } from "react";
import type {
	AppUser,
	MemberProfile,
	PartyDoc,
	PartyLock,
	PlayerAccount,
} from "../types";

export type PartyDetailQueries = {
	isLoading: boolean;
	isAuthenticated: boolean;
	appUser: AppUser | undefined;
	partyLock: PartyLock | undefined;
	accountList: PlayerAccount[];
	accountMap: Map<Id<"playerAccounts">, string>;
	partyData: PartyDoc | null | undefined;
	party: PartyDoc | null;
	memberProfiles: MemberProfile[] | undefined;
	memberProfilesByAccountId: Map<Id<"playerAccounts">, MemberProfile>;
	areMemberProfilesLoading: boolean;
};

export function usePartyDetailQueries(
	partyId: Id<"parties">,
): PartyDetailQueries {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const appUser = useQuery(api.users.getCurrent, isAuthenticated ? {} : "skip");
	const partyLock = useQuery(
		api.parties.getActiveForUser,
		isAuthenticated ? {} : "skip",
	);
	const accounts = useQuery(api.playerAccounts.list, isAuthenticated ? {} : "skip");
	const partyData = useQuery(
		api.parties.get,
		isAuthenticated ? { partyId } : "skip",
	);

	const memberAccountIds = useMemo(
		() =>
			Array.from(
				new Set(
					(partyData?.members ?? [])
						.map((member) => member.playerAccountId)
						.filter(
							(
								accountId,
							): accountId is Id<"playerAccounts"> => accountId !== undefined,
						),
				),
			),
		[partyData],
	);

	const memberProfiles = useQuery(
		api.playerAccounts.getMemberProfiles,
		isAuthenticated && memberAccountIds.length > 0
			? { accountIds: memberAccountIds }
			: "skip",
	);

	const accountList = accounts ?? [];
	const party = partyData ?? null;

	const accountMap = useMemo(
		() =>
			new Map(accountList.map((account) => [account._id, account.username])),
		[accountList],
	);

	const memberProfilesByAccountId = useMemo(
		() =>
			new Map(
				(memberProfiles ?? []).map((profile) => [profile.accountId, profile]),
			),
		[memberProfiles],
	);

	const areMemberProfilesLoading =
		memberProfiles === undefined && memberAccountIds.length > 0;

	return {
		isLoading,
		isAuthenticated,
		appUser,
		partyLock,
		accountList,
		accountMap,
		partyData,
		party,
		memberProfiles,
		memberProfilesByAccountId,
		areMemberProfilesLoading,
	};
}
