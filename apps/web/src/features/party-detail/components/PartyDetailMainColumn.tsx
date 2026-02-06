import { CircleDot } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "../constants";
import { usePartyDetailContext } from "../context";
import { RosterMemberCard } from "./RosterMemberCard";
import { PendingVerificationBadge } from "./VerificationBadge";

export function PartyDetailMainColumn() {
	const {
		party,
		derived,
		formatting: {
			numberFormatter,
			dateFormatter,
			formatMemberName,
			getAccountInitials,
		},
	} = usePartyDetailContext();

	const {
		partyStatus,
		openSlots,
		createdAt,
		updatedAt,
		leaderMember,
		leaderProfile,
		acceptedMembers,
		pendingMembers,
		areMemberProfilesLoading,
		getMemberProfile,
	} = derived;

	return (
		<div className="party-detail-main">
			<Card className="party-mission-card">
				<CardHeader>
					<CardTitle>Mission brief</CardTitle>
					<CardDescription>
						The core details every recruit should know.
					</CardDescription>
				</CardHeader>
				<CardContent className="party-mission-body">
					<div>
						<span className="party-mission-label">Party status</span>
						<p className="party-mission-value">
							{partyStatus === "closed" ? "Closed" : "Open"}
						</p>
					</div>
					<div>
						<span className="party-mission-label">Open slots</span>
						<p className="party-mission-value">
							{numberFormatter.format(openSlots)}
						</p>
					</div>
					<div>
						<span className="party-mission-label">Created</span>
						<p className="party-mission-value">
							{createdAt != null && !Number.isNaN(new Date(createdAt).getTime())
								? dateFormatter.format(new Date(createdAt))
								: "—"}
						</p>
					</div>
					<div>
						<span className="party-mission-label">Last update</span>
						<p className="party-mission-value">
							{updatedAt != null && !Number.isNaN(new Date(updatedAt).getTime())
								? dateFormatter.format(new Date(updatedAt))
								: "—"}
						</p>
					</div>
				</CardContent>
			</Card>

			<Card className="party-roster-card">
				<CardHeader>
					<CardTitle>Roster</CardTitle>
					<CardDescription>
						Accepted members and pending requests.
					</CardDescription>
				</CardHeader>
				<CardContent className="party-roster-body">
					<div className="party-roster-grid">
						{leaderMember ? (
							<RosterMemberCard
								key={`${leaderMember.memberId}-leader`}
								member={leaderMember}
								partyOwnerId={party.ownerId}
								profile={leaderProfile}
								isProfileLoading={
									areMemberProfilesLoading &&
									Boolean(leaderMember.playerAccountId)
								}
							/>
						) : null}
						{acceptedMembers.map((member) => {
							const profile = getMemberProfile(member.playerAccountId);
							return (
								<RosterMemberCard
									key={`${member.memberId}-accepted-${member.playerAccountId}`}
									member={member}
									partyOwnerId={party.ownerId}
									profile={profile}
									isProfileLoading={
										areMemberProfilesLoading && Boolean(member.playerAccountId)
									}
								/>
							);
						})}
						{pendingMembers.map((member) => {
							const profile = getMemberProfile(member.playerAccountId);
							const verificationStatus = profile
								? ((profile.verificationStatus ??
										"unverified") as VerificationStatus)
								: undefined;
							const displayName = formatMemberName(
								member.memberId,
								member.playerAccountId,
								profile?.username,
							);
							return (
								<div
									key={`${member.memberId}-pending-${member.playerAccountId}`}
									className="party-roster-item party-roster-item-pending"
								>
									<div className="party-roster-info">
										<div className="party-roster-header">
											<div className="party-roster-identity">
												<div className={cn("party-roster-avatar")}>
													<span>{getAccountInitials(displayName)}</span>
												</div>
												<div>
													<p className="party-roster-name">{displayName}</p>
													<span className="party-roster-sub">
														Request awaiting approval
													</span>
												</div>
											</div>
											<div className="party-roster-status-group">
												<span className="party-roster-status party-roster-status-pending">
													<CircleDot className="h-3.5 w-3.5" />
													Pending
												</span>
												<PendingVerificationBadge status={verificationStatus} />
											</div>
										</div>
										<div className="party-stats-empty">
											Stats unlock after approval.
										</div>
									</div>
								</div>
							);
						})}
					</div>
					{acceptedMembers.length === 0 && pendingMembers.length === 0 && (
						<p className="party-roster-empty text-muted-foreground">
							No additional members yet. Share the link to start recruiting.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
