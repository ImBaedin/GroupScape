import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	BadgeCheck,
	Check,
	CircleDot,
	Crown,
	Loader2,
	PencilLine,
	ShieldAlert,
	ShieldQuestion,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const statusLabels = {
	unverified: "Unverified",
	pending: "Pending",
	verified: "Verified",
};

type PartyMember = {
	memberId: Id<"users">;
	playerAccountId?: Id<"playerAccounts">;
	status: "pending" | "accepted";
	role?: "leader" | "member";
};

type PartyData = {
	_id: Id<"parties">;
	_creationTime: number;
	ownerId: Id<"users">;
	members: PartyMember[];
	name: string;
	description?: string;
	partySizeLimit: number;
	status?: "open" | "closed";
	createdAt?: number;
	updatedAt?: number;
};

export const Route = createFileRoute("/party/$partyId")({
	component: PartyDetailRoute,
});

function PartyDetailRoute() {
	const { partyId } = Route.useParams();
	const { isAuthenticated, isLoading } = useConvexAuth();
	const convex = useConvex();
	const appUser = useQuery(
		api.users.getCurrent,
		isAuthenticated ? {} : "skip",
	);
	const accounts = useQuery(
		api.playerAccounts.list,
		isAuthenticated ? {} : "skip",
	);
	const requestJoin = useMutation(api.parties.requestJoin);
	const reviewRequest = useMutation(api.parties.reviewRequest);
	const updateDetails = useMutation(api.parties.updateDetails);
	const updateStatus = useMutation(api.parties.updateStatus);
	const removeParty = useMutation(api.parties.remove);
	const navigate = useNavigate();

	const [partyData, setPartyData] = useState<PartyData | null | undefined>(
		undefined,
	);
	const [partyError, setPartyError] = useState<string | null>(null);

	const [selectedAccountId, setSelectedAccountId] = useState<
		Id<"playerAccounts"> | null
	>(null);
	const [isRequesting, setIsRequesting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [draftName, setDraftName] = useState("");
	const [draftDescription, setDraftDescription] = useState("");
	const [isSavingDetails, setIsSavingDetails] = useState(false);
	const [detailsError, setDetailsError] = useState<string | null>(null);
	const [editingField, setEditingField] = useState<
		"name" | "description" | null
	>(null);
	const [statusUpdating, setStatusUpdating] = useState(false);
	const [isClosingParty, setIsClosingParty] = useState(false);
	const [reviewingKey, setReviewingKey] = useState<string | null>(null);

	useEffect(() => {
		if (!accounts || accounts.length === 0) return;
		if (selectedAccountId) return;
		setSelectedAccountId(
			(appUser?.activePlayerAccountId ?? accounts[0]._id) as Id<
				"playerAccounts"
			>,
		);
	}, [accounts, appUser?.activePlayerAccountId, selectedAccountId]);

	useEffect(() => {
		if (!isAuthenticated) {
			setPartyData(null);
			setPartyError(null);
			return;
		}
		let cancelled = false;
		setPartyError(null);
		setPartyData(undefined);
		(async () => {
			try {
				const data = await convex.query(api.parties.get, {
					partyId: partyId as Id<"parties">,
				});
				if (!cancelled) {
					setPartyData(data);
				}
			} catch (error) {
				if (!cancelled) {
					const message =
						error instanceof Error
							? error.message
							: "Unable to load party";
					setPartyError(message);
					setPartyData(null);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [convex, isAuthenticated, partyId]);

	useEffect(() => {
		if (!partyData) return;
		setDraftName(partyData.name);
		setDraftDescription(partyData.description ?? "");
		setDetailsError(null);
	}, [partyData]);

	const accountMap = useMemo(
		() =>
			new Map(
				(accounts ?? []).map((account) => [account._id, account.username]),
			),
		[accounts],
	);
	const accountList = accounts ?? [];
	const selectedAccount = accountList.find(
		(account) => account._id === selectedAccountId,
	);
	const selectedStatus =
		(selectedAccount?.verificationStatus ?? "unverified") as keyof typeof statusLabels;
	const party = partyData ?? null;
	const isOwner = Boolean(party && appUser && party.ownerId === appUser._id);
	const memberEntry =
		party && appUser
			? party.members.find((member) => member.memberId === appUser._id)
			: undefined;
	const memberStatus = memberEntry?.status;
	const leaderEntry = party?.members.find((member) => member.role === "leader");
	const acceptedMembers = party
		? party.members.filter(
				(member) => member.role !== "leader" && member.status === "accepted",
			)
		: [];
	const pendingMembers = party
		? party.members.filter(
				(member) => member.role !== "leader" && member.status === "pending",
			)
		: [];
	const leaderMember = party
		? leaderEntry ?? {
				memberId: party.ownerId,
				playerAccountId: undefined,
				status: "accepted",
				role: "leader",
			}
		: null;
	const acceptedCount = acceptedMembers.length + 1;
	const pendingCount = pendingMembers.length;
	const openSlots = party
		? Math.max(0, party.partySizeLimit - acceptedCount)
		: 0;
	const partyStatus = party?.status ?? "open";
	const approvalsBlockedReason =
		partyStatus === "closed"
			? "Party is closed. Reopen before approving new members."
			: openSlots <= 0
				? "Party is full. Reject a request to free up a slot."
				: null;

	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
		[],
	);

	const formatMemberName = (
		memberId: Id<"users">,
		playerAccountId?: Id<"playerAccounts">,
		preferredName?: string,
	) => {
		const known =
			preferredName?.trim() ||
			(playerAccountId ? accountMap.get(playerAccountId) : undefined);
		const suffix = playerAccountId
			? playerAccountId.slice(-4).toUpperCase()
			: memberId.slice(-4).toUpperCase();
		const baseLabel = known ?? `Account #${suffix}`;
		const isSelf = appUser?._id === memberId;
		const isLeader = party?.ownerId === memberId;
		if (isSelf && isLeader) return `${baseLabel} (You, Leader)`;
		if (isSelf) return `${baseLabel} (You)`;
		if (isLeader) return `${baseLabel} (Leader)`;
		return baseLabel;
	};

	const getAccountInitials = (label: string) => {
		const base = label.trim();
		if (!base) return "GS";
		const parts = base.split(/\s+/).filter(Boolean);
		if (parts.length === 1) {
			return parts[0]?.slice(0, 2).toUpperCase();
		}
		return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
	};

	const isVerified = selectedStatus === "verified";
	const canRequest =
		Boolean(party && selectedAccountId && isAuthenticated) &&
		partyStatus !== "closed" &&
		!memberEntry &&
		!isOwner &&
		openSlots > 0;

	const helperMessage = (() => {
		if (!isAuthenticated) {
			return "Sign in to request an invite.";
		}
		if (!selectedAccount) {
			return "Select an account to request a seat.";
		}
		if (isOwner) {
			return "You lead this party.";
		}
		if (memberStatus === "accepted") {
			return "You are already in this party.";
		}
		if (memberStatus === "pending") {
			return "Your request is pending leader approval.";
		}
		if (partyStatus === "closed") {
			return "This party is closed for new invites.";
		}
		if (!isOwner && openSlots === 0) {
			return "This party is currently full.";
		}
		if (!isOwner && !isVerified) {
			return "Unverified requests are reviewed after verified accounts.";
		}
		return "Send a join request to the party leader.";
	})();

	const handleRequestJoin = async () => {
		if (!party || !selectedAccountId) return;
		setIsRequesting(true);
		setRequestError(null);
		try {
			await requestJoin({
				partyId: party._id,
				playerAccountId: selectedAccountId,
			});
			toast.success("Join request sent");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unable to request to join";
			setRequestError(message);
			toast.error(message);
		} finally {
			setIsRequesting(false);
		}
	};

	const handleSaveDetails = async (event?: React.FormEvent) => {
		event?.preventDefault();
		if (!party) return;
		const trimmedName = draftName.trim();
		if (!trimmedName) {
			setDetailsError("Party name cannot be empty.");
			return;
		}
		setIsSavingDetails(true);
		setDetailsError(null);
		try {
			await updateDetails({
				partyId: party._id,
				name: trimmedName,
				description: draftDescription.trim() || undefined,
			});
			toast.success("Party details updated");
			setEditingField(null);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unable to update party details";
			setDetailsError(message);
			toast.error(message);
		} finally {
			setIsSavingDetails(false);
		}
	};

	const handleResetDetails = () => {
		if (!party) return;
		setDraftName(party.name);
		setDraftDescription(party.description ?? "");
		setDetailsError(null);
		setEditingField(null);
	};

	const startEditing = (field: "name" | "description") => {
		if (!isOwner) return;
		setEditingField(field);
		setDetailsError(null);
	};

	const handleStatusChange = async (nextStatus: "open" | "closed") => {
		if (!party || nextStatus === partyStatus) return;
		setStatusUpdating(true);
		try {
			await updateStatus({ partyId: party._id, status: nextStatus });
			toast.success(
				nextStatus === "open" ? "Party reopened" : "Party closed",
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to update status";
			toast.error(message);
		} finally {
			setStatusUpdating(false);
		}
	};

	const handleCloseParty = async () => {
		if (!party) return;
		const confirmed = window.confirm(
			"Close this party for good? This will remove the party and all requests.",
		);
		if (!confirmed) return;
		setIsClosingParty(true);
		try {
			await removeParty({ partyId: party._id });
			toast.success("Party closed");
			await navigate({ to: "/parties", search: { search: "" } });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to close party";
			toast.error(message);
		} finally {
			setIsClosingParty(false);
		}
	};

	const handleReviewRequest = async (
		member: PartyMember,
		approve: boolean,
	) => {
		if (!party) return;
		if (!member.playerAccountId) return;
		const baseKey = `${member.memberId}:${member.playerAccountId}`;
		const actionKey = `${baseKey}:${approve ? "approve" : "reject"}`;
		setReviewingKey(actionKey);
		try {
			await reviewRequest({
				partyId: party._id,
				memberId: member.memberId,
				playerAccountId: member.playerAccountId,
				approve,
			});
			toast.success(approve ? "Request approved" : "Request declined");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to review request";
			toast.error(message);
		} finally {
			setReviewingKey((prev) => (prev === actionKey ? null : prev));
		}
	};

	if (isLoading) {
		return (
			<div className="party-detail flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-16">
				<div className="party-loading">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading party...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="party-detail min-h-[calc(100svh-4rem)] px-4 py-16 sm:px-8">
				<div className="party-detail-shell mx-auto max-w-5xl">
					<Card className="party-guest">
						<CardHeader>
							<CardTitle>Sign in to view parties</CardTitle>
							<CardDescription>
								Authenticate to see the roster and request an invite.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-3">
							<Link
								to="/auth"
								className={cn(buttonVariants(), "party-primary")}
							>
								Sign In
							</Link>
							<Link
								to="/auth"
								search={{ mode: "sign-up" }}
								className={cn(
									buttonVariants({ variant: "secondary" }),
									"party-secondary",
								)}
							>
								Create Account
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	if (partyData === undefined) {
		return (
			<div className="party-detail flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-16">
				<div className="party-loading">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Fetching party details...</span>
				</div>
			</div>
		);
	}

	if (partyData === null || !party) {
		return (
			<div className="party-detail min-h-[calc(100svh-4rem)] px-4 py-16 sm:px-8">
				<div className="party-detail-shell mx-auto max-w-5xl">
					<Card className="party-empty">
						<CardHeader>
							<CardTitle>Party not found</CardTitle>
							<CardDescription>
								This party may have been closed or removed.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-3">
							<Link
								to="/parties"
								search={{ search: "" }}
								className={cn(
									buttonVariants({ variant: "secondary" }),
									"party-secondary",
								)}
							>
								Back to parties
							</Link>
						</CardContent>
						{partyError && (
							<CardContent className="pt-0">
								<div className="party-join-error">{partyError}</div>
							</CardContent>
						)}
					</Card>
				</div>
			</div>
		);
	}

	const createdAt = party.createdAt ?? party._creationTime;
	const updatedAt = party.updatedAt ?? createdAt;

	return (
		<div className="party-detail min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
			<div className="party-detail-shell mx-auto max-w-6xl">
				<header className="party-detail-header">
					<Link
						to="/parties"
						search={{ search: "" }}
						className={cn(
							buttonVariants({ variant: "secondary", size: "sm" }),
							"party-detail-back",
						)}
					>
						<ArrowLeft className="h-4 w-4" />
						Back to board
					</Link>
					<div className="party-detail-title">
						<p className="party-detail-eyebrow">Party Brief</p>
						{isOwner ? (
							<div className="party-detail-edit">
								{editingField === "name" ? (
									<form
										onSubmit={(event) => handleSaveDetails(event)}
										className="party-edit-form"
									>
										<Label htmlFor="party-name">Party name</Label>
										<Input
											id="party-name"
											value={draftName}
											onChange={(event) => setDraftName(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Escape") {
													event.preventDefault();
													handleResetDetails();
												}
											}}
											autoFocus
										/>
										<div className="party-edit-actions">
											<Button
												type="submit"
												className="party-join-button"
												disabled={!draftName.trim() || isSavingDetails}
											>
												{isSavingDetails ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Check className="h-4 w-4" />
												)}
												Save
											</Button>
											<Button
												type="button"
												variant="secondary"
												onClick={handleResetDetails}
												disabled={isSavingDetails}
											>
												<X className="h-4 w-4" />
												Cancel
											</Button>
										</div>
										{detailsError && (
											<div className="party-join-error">{detailsError}</div>
										)}
									</form>
								) : (
									<button
										type="button"
										className="party-edit-trigger"
										onClick={() => startEditing("name")}
									>
										<h1 className="party-detail-name text-4xl sm:text-5xl">
											{party.name}
										</h1>
										<span className="party-edit-icon">
											<PencilLine className="h-4 w-4" />
										</span>
									</button>
								)}
								{editingField === "description" ? (
									<form
										onSubmit={(event) => handleSaveDetails(event)}
										className="party-edit-form"
									>
										<Label htmlFor="party-description">Description</Label>
										<Textarea
											id="party-description"
											value={draftDescription}
											onChange={(event) =>
												setDraftDescription(event.target.value)
											}
											onKeyDown={(event) => {
												if (event.key === "Escape") {
													event.preventDefault();
													handleResetDetails();
												}
											}}
											rows={4}
											autoFocus
										/>
										<div className="party-edit-actions">
											<Button
												type="submit"
												className="party-join-button"
												disabled={isSavingDetails}
											>
												{isSavingDetails ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Check className="h-4 w-4" />
												)}
												Save
											</Button>
											<Button
												type="button"
												variant="secondary"
												onClick={handleResetDetails}
												disabled={isSavingDetails}
											>
												<X className="h-4 w-4" />
												Cancel
											</Button>
										</div>
										{detailsError && (
											<div className="party-join-error">{detailsError}</div>
										)}
									</form>
								) : (
									<button
										type="button"
										className="party-edit-trigger party-edit-trigger-desc"
										onClick={() => startEditing("description")}
									>
										<p className="party-detail-desc text-lg text-muted-foreground">
											{party.description?.trim()
												? party.description
												: "Click to add a description so recruits know the expectations."}
										</p>
										<span className="party-edit-icon">
											<PencilLine className="h-4 w-4" />
										</span>
									</button>
								)}
							</div>
						) : (
							<>
								<h1 className="party-detail-name text-4xl sm:text-5xl">
									{party.name}
								</h1>
								<p className="party-detail-desc text-lg text-muted-foreground">
									{party.description?.trim()
										? party.description
										: "No leader notes yet. Check roster details or send a request to ask about goals and loadouts."}
								</p>
							</>
						)}
					</div>
					<div className="party-detail-badges">
						<span className="party-detail-badge">
							<Crown className="h-4 w-4" />
							Leader {isOwner ? "You" : "Board"}
						</span>
						<span className="party-detail-badge">
							<Users className="h-4 w-4" />
							{numberFormatter.format(acceptedCount)} /{" "}
							{numberFormatter.format(party.partySizeLimit)} accepted
						</span>
						<span className="party-detail-badge">
							<CircleDot className="h-4 w-4" />
							{numberFormatter.format(pendingCount)} requests
						</span>
					</div>
				</header>

				<section className="party-detail-grid">
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
										{dateFormatter.format(new Date(createdAt))}
									</p>
								</div>
								<div>
									<span className="party-mission-label">Last update</span>
									<p className="party-mission-value">
										{dateFormatter.format(new Date(updatedAt))}
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
									{leaderMember && (
										<RosterMemberCard
											key={`${leaderMember.memberId}-leader`}
											member={leaderMember}
											partyOwnerId={party.ownerId}
											numberFormatter={numberFormatter}
											dateFormatter={dateFormatter}
											formatMemberName={formatMemberName}
											getAccountInitials={getAccountInitials}
										/>
									)}
									{acceptedMembers.map((member) => (
										<RosterMemberCard
											key={`${member.memberId}-accepted-${member.playerAccountId}`}
											member={member}
											partyOwnerId={party.ownerId}
											numberFormatter={numberFormatter}
											dateFormatter={dateFormatter}
											formatMemberName={formatMemberName}
											getAccountInitials={getAccountInitials}
										/>
									))}
									{pendingMembers.map((member) => {
										const displayName = formatMemberName(
											member.memberId,
											member.playerAccountId,
										);
										return (
											<div
												key={`${member.memberId}-pending-${member.playerAccountId}`}
												className="party-roster-item party-roster-item-pending"
											>
											<div className="party-roster-info">
												<div className="party-roster-header">
													<div className="party-roster-identity">
														<div
															className={cn(
																"party-roster-avatar",
															)}
														>
															<span>
																{getAccountInitials(displayName)}
															</span>
														</div>
														<div>
															<p className="party-roster-name">
																{displayName}
															</p>
															<span className="party-roster-sub">
																Request awaiting approval
															</span>
														</div>
													</div>
													<span className="party-roster-status party-roster-status-pending">
														<CircleDot className="h-3.5 w-3.5" />
														Pending
													</span>
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

					<div className="party-detail-side">
						{isOwner ? (
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
													variant={
														partyStatus === "open" ? "default" : "secondary"
													}
													disabled={statusUpdating}
													onClick={() => handleStatusChange("open")}
												>
													Open
												</Button>
												<Button
													type="button"
													variant={
														partyStatus === "closed" ? "default" : "secondary"
													}
													disabled={statusUpdating}
													onClick={() => handleStatusChange("closed")}
												>
													Closed
												</Button>
											</div>
											<p className="party-owner-note text-muted-foreground">
												Closed parties stop new requests and disappear from the
												board.
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
											<div className="party-approval-empty">
												No pending requests yet.
											</div>
										) : (
											<div className="party-approval-list">
												{pendingMembers.map((member) => {
													const baseKey = `${member.memberId}:${member.playerAccountId}`;
													const approveKey = `${baseKey}:approve`;
													const rejectKey = `${baseKey}:reject`;
													const isMemberReviewing =
														reviewingKey?.startsWith(`${baseKey}:`) ?? false;
													const isApproveLoading =
														reviewingKey === approveKey;
													const isRejectLoading = reviewingKey === rejectKey;
													const disableApprove =
														isMemberReviewing ||
														partyStatus === "closed" ||
														openSlots <= 0;
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
																	)}
																</span>
																<span className="party-approval-meta">
																	Awaiting leader decision
																</span>
															</div>
															<span className="party-roster-status party-roster-status-pending">
																<CircleDot className="h-3.5 w-3.5" />
																Pending
															</span>
															<div className="party-approval-actions">
																<Button
																	size="sm"
																	className="party-approval-approve"
																	disabled={disableApprove}
																	onClick={() =>
																		handleReviewRequest(member, true)
																	}
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
																	onClick={() =>
																		handleReviewRequest(member, false)
																	}
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
										{approvalsBlockedReason && pendingMembers.length > 0 && (
											<div className="party-approval-warning">
												{approvalsBlockedReason}
											</div>
										)}
									</CardContent>
								</Card>
							</>
						) : (
							<Card className="party-join-card">
								<CardHeader>
									<CardTitle>Request to join</CardTitle>
									<CardDescription>
										Choose an account to request to join. Verified accounts
										are reviewed first.
									</CardDescription>
								</CardHeader>
								<CardContent className="party-join-body">
									{accountList.length === 0 ? (
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
												const status =
													(account.verificationStatus ??
														"unverified") as keyof typeof statusLabels;
												const isSelected = account._id === selectedAccountId;
												const isActive =
													appUser?.activePlayerAccountId === account._id;
												return (
													<button
														key={account._id}
														type="button"
														className={cn(
															"party-account-option",
															isSelected && "is-selected",
														)}
														onClick={() =>
															setSelectedAccountId(account._id)
														}
													>
														<div className="party-account-info">
															<span className="party-account-name">
																{account.username}
															</span>
															<span
																className={`account-status account-status-${status}`}
															>
																{status === "verified" ? (
																	<BadgeCheck className="h-3.5 w-3.5" />
																) : status === "pending" ? (
																	<ShieldAlert className="h-3.5 w-3.5" />
																) : (
																	<ShieldQuestion className="h-3.5 w-3.5" />
																)}
																{statusLabels[status]}
															</span>
														</div>
														{isActive && (
															<span className="party-account-active">
																Active
															</span>
														)}
													</button>
												);
											})}
										</div>
									)}
									<div
										className={cn(
											"party-join-note",
											!canRequest && "party-join-note-warning",
										)}
									>
										{helperMessage}
									</div>
									<Button
										className="party-join-button"
										disabled={!canRequest || isRequesting}
										onClick={handleRequestJoin}
									>
										{isRequesting ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Users className="h-4 w-4" />
										)}
										{memberStatus === "pending"
											? "Request pending"
											: "Send join request"}
									</Button>
									{requestError && (
										<div className="party-join-error">{requestError}</div>
									)}
								</CardContent>
							</Card>
						)}

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
					</div>
				</section>
			</div>
		</div>
	);
}

type RosterMemberCardProps = {
	member: PartyMember;
	partyOwnerId: Id<"users">;
	numberFormatter: Intl.NumberFormat;
	dateFormatter: Intl.DateTimeFormat;
	formatMemberName: (
		memberId: Id<"users">,
		playerAccountId?: Id<"playerAccounts">,
		preferredName?: string,
	) => string;
	getAccountInitials: (label: string) => string;
};

function RosterMemberCard({
	member,
	partyOwnerId,
	numberFormatter,
	dateFormatter,
	formatMemberName,
	getAccountInitials,
}: RosterMemberCardProps) {
	const profile = useQuery(
		api.playerAccounts.getMemberProfile,
		member.playerAccountId ? { accountId: member.playerAccountId } : "skip",
	);
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
		if (profile === undefined) {
			return <div className="party-stats-empty">Loading stats...</div>;
		}
		return (
			<RosterStats
				summary={profile.summary}
				lastUpdated={profile.lastUpdated}
				isStale={profile.isStale}
				numberFormatter={numberFormatter}
				dateFormatter={dateFormatter}
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

type CombatSkillsSummary = {
	attack: number;
	strength: number;
	defence: number;
	hitpoints: number;
	ranged: number;
	magic: number;
	prayer: number;
};

type BossKcSummary = {
	key: string;
	label: string;
	score: number;
	rank: number;
};

type StatsSummary = {
	combatLevel: number;
	totalLevel: number;
	combatSkills: CombatSkillsSummary;
	bossKc: BossKcSummary[];
};

const COMBAT_SKILL_LABELS: Array<{
	key: keyof CombatSkillsSummary;
	label: string;
	icon: string;
}> = [
	{ key: "attack", label: "Atk", icon: "/ui/skills/attack.png" },
	{ key: "strength", label: "Str", icon: "/ui/skills/strength.png" },
	{ key: "defence", label: "Def", icon: "/ui/skills/defence.png" },
	{ key: "hitpoints", label: "HP", icon: "/ui/skills/hitpoints.png" },
	{ key: "ranged", label: "Rng", icon: "/ui/skills/ranged.png" },
	{ key: "magic", label: "Mag", icon: "/ui/skills/magic.png" },
	{ key: "prayer", label: "Pray", icon: "/ui/skills/prayer.png" },
];

function RosterStats({
	summary,
	lastUpdated,
	isStale,
	numberFormatter,
	dateFormatter,
}: {
	summary?: StatsSummary;
	lastUpdated?: number;
	isStale: boolean;
	numberFormatter: Intl.NumberFormat;
	dateFormatter: Intl.DateTimeFormat;
}) {
	if (!summary) {
		return <div className="party-stats-empty">No hiscores snapshot yet.</div>;
	}

	const updatedLabel = lastUpdated
		? dateFormatter.format(new Date(lastUpdated))
		: "Not updated yet";

	return (
		<div className="party-stats">
			<div className="party-stats-top">
				<div className="party-stats-metric">
					<span>Combat</span>
					<strong>{numberFormatter.format(summary.combatLevel)}</strong>
				</div>
				<div className="party-stats-metric">
					<span>Total</span>
					<strong>{numberFormatter.format(summary.totalLevel)}</strong>
				</div>
			</div>
			<div className="party-stats-skills">
				{COMBAT_SKILL_LABELS.map((skill) => (
					<div key={skill.key} className="party-stats-skill">
						<span className="party-stats-skill-label">
							<img
								src={skill.icon}
								alt={`${skill.label} icon`}
								className="party-stats-skill-icon"
								loading="lazy"
							/>
							{skill.label}
						</span>
						<strong>
							{numberFormatter.format(summary.combatSkills[skill.key])}
						</strong>
					</div>
				))}
			</div>
			<div className="party-stats-footer">
				<span>Updated {updatedLabel}</span>
				{isStale && <span className="party-stats-stale">Stale</span>}
			</div>
		</div>
	);
}
