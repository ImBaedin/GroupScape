import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { BadgeCheck, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePartyDetailContext } from "../context";
import type { MemberProfile, PartyMember } from "../types";
import { RosterStats } from "./RosterStats";

type RosterMemberCardProps = {
	member: PartyMember;
	partyOwnerId: Id<"users">;
	profile?: MemberProfile;
	isProfileLoading: boolean;
};

export function RosterMemberCard({
	member,
	partyOwnerId,
	profile,
	isProfileLoading,
}: RosterMemberCardProps) {
	const {
		formatting: { formatMemberName, getAccountInitials },
	} = usePartyDetailContext();

	const isLeader = member.role === "leader" || member.memberId === partyOwnerId;
	const displayName = formatMemberName(
		member.memberId,
		member.playerAccountId,
		profile?.username,
	);
	const initials = getAccountInitials(displayName);
	const headshotUrl = profile?.headshotUrl;
	const StatusIcon = isLeader ? Crown : BadgeCheck;
	const subLabel = isLeader ? "Party leader" : "Accepted member";
	const statusLabel = isLeader ? "Leader" : "Accepted";

	const statsBody = (() => {
		if (!member.playerAccountId) {
			return <div className="party-stats-empty">No linked account yet.</div>;
		}
		if (isProfileLoading) {
			return <div className="party-stats-empty">Loading stats...</div>;
		}
		if (!profile) {
			return <div className="party-stats-empty">Account data unavailable.</div>;
		}
		return (
			<RosterStats
				summary={profile.summary}
				lastUpdated={profile.lastUpdated}
				isStale={profile.isStale ?? true}
			/>
		);
	})();

	return (
		<div className="party-roster-item party-roster-item-accepted">
			<div className="party-roster-info">
				<div className="party-roster-header">
					<div className="party-roster-identity">
						<div
							className={cn(
								"party-roster-avatar",
								headshotUrl && "party-roster-avatar-image",
							)}
						>
							{headshotUrl ? (
								<img src={headshotUrl} alt={`${displayName} headshot`} />
							) : (
								<span>{initials}</span>
							)}
						</div>
						<div>
							<p className="party-roster-name">{displayName}</p>
							<span className="party-roster-sub">{subLabel}</span>
						</div>
					</div>
					<span className="party-roster-status party-roster-status-accepted">
						<StatusIcon className="h-3.5 w-3.5" />
						{statusLabel}
					</span>
				</div>
				{statsBody}
			</div>
		</div>
	);
}
