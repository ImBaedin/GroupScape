import { Check, CircleDot, Loader2, LogOut, Trash2, UserMinus, Users, X } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "../constants";
import { usePartyDetailContext } from "../context";
import { useJoinRequestActions } from "../hooks/useJoinRequestActions";
import { usePartyMembershipActions } from "../hooks/usePartyMembershipActions";
import { usePartyOwnerActions } from "../hooks/usePartyOwnerActions";
import { PendingVerificationBadge, VerificationBadge } from "./VerificationBadge";

export function PartyDetailSideColumn() {
	const {
		derived: { isOwner },
	} = usePartyDetailContext();

	return (
		<div className="party-detail-side">
			{isOwner ? <PartyLeaderPanel /> : <PartyJoinPanel />}
			<QuickTipsCard />
		</div>
	);
}

function PartyLeaderPanel() {
	const navigate = useNavigate();
	const {
		party,
		derived: {
			partyStatus,
			pendingMembers,
			acceptedMembers,
			openSlots,
			approvalsBlockedReason,
			getMemberProfile,
		},
		formatting: { formatMemberName },
	} = usePartyDetailContext();

	const [statusUpdating, setStatusUpdating] = useState(false);
	const [isClosingParty, setIsClosingParty] = useState(false);
	const [reviewingKey, setReviewingKey] = useState<string | null>(null);
	const [kickingMemberKey, setKickingMemberKey] = useState<string | null>(null);
	const ownerActions = usePartyOwnerActions({ partyId: party._id });

	const handleStatusChange = async (nextStatus: "open" | "closed") => {
		if (statusUpdating || nextStatus === partyStatus) return;
		setStatusUpdating(true);
		try {
			await ownerActions.handleStatusChange(nextStatus);
		} finally {
			setStatusUpdating(false);
		}
	};

	const handleCloseParty = async () => {
		if (isClosingParty) return;
		const confirmed = window.confirm(
			"Close this party for good? This will remove the party and all requests.",
		);
		if (!confirmed) return;
		setIsClosingParty(true);
		try {
			const result = await ownerActions.handleCloseParty();
			if (result.ok) {
				await navigate({ to: "/parties", search: { search: "" } });
			}
		} finally {
			setIsClosingParty(false);
		}
	};

	const handleReviewRequest = async (
		member: (typeof pendingMembers)[number],
		approve: boolean,
	) => {
		if (!member.playerAccountId) return;
		const baseKey = `${member.memberId}:${member.playerAccountId}`;
		const actionKey = `${baseKey}:${approve ? "approve" : "reject"}`;
		setReviewingKey(actionKey);
		try {
			await ownerActions.handleReviewRequest(member, approve);
		} finally {
			setReviewingKey((prev) => (prev === actionKey ? null : prev));
		}
	};

	const handleKickMember = async (
		member: (typeof acceptedMembers)[number],
	) => {
		if (kickingMemberKey) return;
		const memberKey = `${member.memberId}:${member.playerAccountId ?? "none"}`;
		setKickingMemberKey(memberKey);
		try {
			await ownerActions.handleKickMember(member);
		} finally {
			setKickingMemberKey((prev) => (prev === memberKey ? null : prev));
		}
	};

	return (
		<>
			<Card className="party-owner-card">
				<CardHeader>
					<CardTitle>Leader controls</CardTitle>
					<CardDescription>
						Open or close the party, or remove it entirely.
					</CardDescription>
				</CardHeader>
				<CardContent className="party-owner-body">
					<div className="party-owner-section">
						<span className="party-owner-label">Party status</span>
						<div className="party-owner-toggle">
							<Button
								type="button"
								variant={partyStatus === "open" ? "default" : "secondary"}
								disabled={statusUpdating}
								onClick={() => handleStatusChange("open")}
							>
								Open
							</Button>
							<Button
								type="button"
								variant={partyStatus === "closed" ? "default" : "secondary"}
								disabled={statusUpdating}
								onClick={() => handleStatusChange("closed")}
							>
								Closed
							</Button>
						</div>
						<p className="party-owner-note text-muted-foreground">
							Closed parties stop new requests and disappear from the board.
						</p>
					</div>
					<div className="party-owner-section party-owner-danger">
						<span className="party-owner-label">Close for good</span>
						<p className="party-owner-note text-muted-foreground">
							This removes the party and all pending requests.
						</p>
						<Button
							type="button"
							variant="destructive"
							disabled={isClosingParty}
							onClick={handleCloseParty}
						>
							{isClosingParty ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="h-4 w-4" />
							)}
							Close party
						</Button>
					</div>
				</CardContent>
			</Card>
			<Card className="party-approval-card">
				<CardHeader>
					<CardTitle>Pending approvals</CardTitle>
					<CardDescription>
						Review new requests before they join the roster.
					</CardDescription>
				</CardHeader>
				<CardContent className="party-approval-body">
					{pendingMembers.length === 0 ? (
						<div className="party-approval-empty">No pending requests yet.</div>
					) : (
						<div className="party-approval-list">
							{pendingMembers.map((member) => {
								const profile = getMemberProfile(member.playerAccountId);
								const verificationStatus = profile
									? ((profile.verificationStatus ??
											"unverified") as VerificationStatus)
									: undefined;
								const baseKey = `${member.memberId}:${member.playerAccountId}`;
								const approveKey = `${baseKey}:approve`;
								const rejectKey = `${baseKey}:reject`;
								const isMemberReviewing =
									reviewingKey?.startsWith(`${baseKey}:`) ?? false;
								const isApproveLoading = reviewingKey === approveKey;
								const isRejectLoading = reviewingKey === rejectKey;
								const disableApprove =
									isMemberReviewing || partyStatus === "closed" || openSlots <= 0;

								return (
									<div
										key={`${member.memberId}-${member.playerAccountId}`}
										className="party-approval-item"
									>
										<div className="party-approval-info">
											<span className="party-approval-name">
												{formatMemberName(
													member.memberId,
													member.playerAccountId,
													profile?.username,
												)}
											</span>
											<span className="party-approval-meta">
												Awaiting leader decision
											</span>
										</div>
										<div className="party-approval-status-group">
											<span className="party-roster-status party-roster-status-pending">
												<CircleDot className="h-3.5 w-3.5" />
												Pending
											</span>
											<PendingVerificationBadge status={verificationStatus} />
										</div>
										<div className="party-approval-actions">
											<Button
												size="sm"
												className="party-approval-approve"
												disabled={disableApprove}
												onClick={() => handleReviewRequest(member, true)}
											>
												{isApproveLoading ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Check className="h-4 w-4" />
												)}
												Approve
											</Button>
											<Button
												size="sm"
												variant="secondary"
												className="party-approval-reject"
												disabled={isMemberReviewing}
												onClick={() => handleReviewRequest(member, false)}
											>
												{isRejectLoading ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<X className="h-4 w-4" />
												)}
												Reject
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
					{approvalsBlockedReason && pendingMembers.length > 0 ? (
						<div className="party-approval-warning">{approvalsBlockedReason}</div>
					) : null}
				</CardContent>
			</Card>
			<Card className="party-approval-card">
				<CardHeader>
					<CardTitle>Member management</CardTitle>
					<CardDescription>Remove accepted members from the party.</CardDescription>
				</CardHeader>
				<CardContent className="party-approval-body">
					{acceptedMembers.length === 0 ? (
						<div className="party-approval-empty">No accepted members yet.</div>
					) : (
						<div className="party-approval-list">
							{acceptedMembers.map((member) => {
								const profile = getMemberProfile(member.playerAccountId);
								const memberKey = `${member.memberId}:${member.playerAccountId ?? "none"}`;
								const isKicking = kickingMemberKey === memberKey;
								return (
									<div
										key={`${member.memberId}-${member.playerAccountId}`}
										className="party-approval-item"
									>
										<div className="party-approval-info">
											<span className="party-approval-name">
												{formatMemberName(
													member.memberId,
													member.playerAccountId,
													profile?.username,
												)}
											</span>
											<span className="party-approval-meta">Accepted member</span>
										</div>
										<div className="party-approval-actions">
											<Button
												size="sm"
												variant="destructive"
												disabled={Boolean(kickingMemberKey)}
												onClick={() => handleKickMember(member)}
											>
												{isKicking ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<UserMinus className="h-4 w-4" />
												)}
												Kick
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
}

function PartyJoinPanel() {
	const {
		party,
		appUser,
		partyLock,
		accountList,
		isAuthenticated,
		derived: { isOwner, partyStatus, openSlots, memberEntry },
	} = usePartyDetailContext();
	const [selectedAccountOverrideId, setSelectedAccountOverrideId] = useState<
		typeof accountList[number]["_id"] | null
	>(null);
	const [isRequesting, setIsRequesting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [isLeaving, setIsLeaving] = useState(false);
	const membershipActions = usePartyMembershipActions({ partyId: party._id });

	const joinActions = useJoinRequestActions({
		isAuthenticated,
		party,
		partyLock,
		accountList,
		appUser,
		isOwner,
		memberEntry,
		openSlots,
		partyStatus,
		selectedAccountOverrideId,
	});

	const handleRequestJoin = async () => {
		if (isRequesting) return;
		setIsRequesting(true);
		setRequestError(null);
		const result = await joinActions.handleRequestJoin();
		if (!result?.ok && result?.error) {
			setRequestError(result.error);
		}
		setIsRequesting(false);
	};

	const handleLeaveParty = async () => {
		if (isLeaving || !memberEntry) return;
		setIsLeaving(true);
		setRequestError(null);
		const result = await membershipActions.handleLeaveParty(
			memberEntry.playerAccountId,
		);
		if (!result.ok) {
			setRequestError(result.error);
		}
		setIsLeaving(false);
	};

	return (
		<Card className="party-join-card">
			<CardHeader>
				<CardTitle>{memberEntry ? "Party membership" : "Request to join"}</CardTitle>
				<CardDescription>
					{memberEntry
						? "Leave the party at any time."
						: "Choose an account to request to join. Verified accounts are reviewed first."}
				</CardDescription>
			</CardHeader>
			<CardContent className="party-join-body">
				{memberEntry ? (
					<>
						<div className="party-join-note">
							{memberEntry.status === "pending"
								? "Your join request is pending. Leave to cancel it."
								: "You are currently in this party."}
						</div>
						<Button
							variant="secondary"
							className="party-join-button"
							disabled={isLeaving}
							onClick={handleLeaveParty}
						>
							{isLeaving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<LogOut className="h-4 w-4" />
							)}
							{memberEntry.status === "pending"
								? "Cancel request"
								: "Leave party"}
						</Button>
					</>
				) : accountList.length === 0 ? (
					<div className="party-empty">
						<p>No accounts linked yet.</p>
						<p className="text-muted-foreground">
							Head to your profile to link an OSRS username.
						</p>
						<Link
							to="/profile"
							className={cn(
								buttonVariants({ variant: "secondary", size: "sm" }),
								"party-secondary",
							)}
						>
							Go to profile
						</Link>
					</div>
				) : (
					<div className="party-account-list">
						{accountList.map((account) => {
							const status = (account.verificationStatus ??
								"unverified") as VerificationStatus;
							const isSelected = account._id === joinActions.selectedAccountId;
							const isActive = appUser?.activePlayerAccountId === account._id;
							return (
								<button
									key={account._id}
									type="button"
									className={cn(
										"party-account-option",
										isSelected && "is-selected",
									)}
									onClick={() => setSelectedAccountOverrideId(account._id)}
								>
									<div className="party-account-info">
										<span className="party-account-name">{account.username}</span>
										<VerificationBadge status={status} />
									</div>
									{isActive ? (
										<span className="party-account-active">Active</span>
									) : null}
								</button>
							);
						})}
					</div>
				)}
				{!memberEntry ? (
					<>
						<div
							className={cn(
								"party-join-note",
								!joinActions.canRequest && "party-join-note-warning",
							)}
						>
							{joinActions.helperMessage}
						</div>
						<Button
							className="party-join-button"
							disabled={!joinActions.canRequest || isRequesting}
							onClick={handleRequestJoin}
						>
							{isRequesting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Users className="h-4 w-4" />
							)}
							{joinActions.memberStatus === "pending"
								? "Request pending"
								: "Send join request"}
						</Button>
					</>
				) : null}
				{requestError ? (
					<div className="party-join-error">{requestError}</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function QuickTipsCard() {
	return (
		<Card className="party-tip-card">
			<CardHeader>
				<CardTitle>Quick tips</CardTitle>
				<CardDescription>Boost your approval odds.</CardDescription>
			</CardHeader>
			<CardContent className="party-tip-body">
				<ul className="party-tip-list">
					<li>Verify your account right before requesting.</li>
					<li>Add a brief role note in your join message.</li>
					<li>Respect party size limits and leader timing.</li>
				</ul>
			</CardContent>
		</Card>
	);
}
