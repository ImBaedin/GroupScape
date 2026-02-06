import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { useCallback, useMemo } from "react";

type FormatMemberName = (
	memberId: Id<"users">,
	playerAccountId?: Id<"playerAccounts">,
	preferredName?: string,
) => string;

export type PartyFormatting = {
	numberFormatter: Intl.NumberFormat;
	dateFormatter: Intl.DateTimeFormat;
	formatMemberName: FormatMemberName;
	getAccountInitials: (label: string) => string;
};

type UsePartyFormattingArgs = {
	accountMap: Map<Id<"playerAccounts">, string>;
	appUserId?: Id<"users">;
	partyOwnerId?: Id<"users">;
};

export function usePartyFormatting({
	accountMap,
	appUserId,
	partyOwnerId,
}: UsePartyFormattingArgs): PartyFormatting {
	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
		[],
	);

	const formatMemberName = useCallback<FormatMemberName>(
		(memberId, playerAccountId, preferredName) => {
			const known =
				preferredName?.trim() ||
				(playerAccountId ? accountMap.get(playerAccountId) : undefined);
			const suffix = playerAccountId
				? playerAccountId.slice(-4).toUpperCase()
				: memberId.slice(-4).toUpperCase();
			const baseLabel = known ?? `Account #${suffix}`;
			const isSelf = appUserId === memberId;
			const isLeader = partyOwnerId === memberId;
			if (isSelf && isLeader) return `${baseLabel} (You, Leader)`;
			if (isSelf) return `${baseLabel} (You)`;
			if (isLeader) return `${baseLabel} (Leader)`;
			return baseLabel;
		},
		[accountMap, appUserId, partyOwnerId],
	);

	const getAccountInitials = useCallback((label: string) => {
		const base = label.trim();
		if (!base) return "GS";
		const parts = base.split(/\s+/).filter(Boolean);
		if (parts.length === 1) {
			return parts[0]?.slice(0, 2).toUpperCase() ?? "GS";
		}
		return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
	}, []);

	return useMemo(
		() => ({
			numberFormatter,
			dateFormatter,
			formatMemberName,
			getAccountInitials,
		}),
		[numberFormatter, dateFormatter, formatMemberName, getAccountInitials],
	);
}
