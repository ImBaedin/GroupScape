import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import {
	Camera,
	Clock3,
	Loader2,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	ShieldQuestion,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProfileAccountActionsState } from "../hooks/useProfileAccountActions";
import type { ProfileHeadshotActionsState } from "../hooks/useProfileHeadshotActions";
import type { ProfileQueriesState } from "../hooks/useProfileQueries";
import type { ProfileVerificationActionsState } from "../hooks/useProfileVerificationActions";
import {
	COMBAT_SKILL_LABELS,
	formatRemaining,
	formatSkillLabel,
	statusLabels,
} from "../lib/profile-view";
import type { VerificationStatus } from "../types";
import { ProfileAccountAvatar } from "./ProfileAccountAvatar";
import { ProfileVerificationWindowState } from "./ProfileVerificationWindowState";

const HeadshotSelector = lazy(() => import("@/components/headshot-selector"));

type Account = ProfileQueriesState["accountList"][number];

type ProfileAccountCardProps = {
	account: Account;
	dateFormatter: Intl.DateTimeFormat;
	numberFormatter: Intl.NumberFormat;
	accountStatsMap: ProfileQueriesState["accountStatsMap"];
	headshotByAccountId: ProfileQueriesState["headshotByAccountId"];
	verificationState: ProfileVerificationActionsState["verificationState"];
	refreshingStatsId: ProfileAccountActionsState["refreshingStatsId"];
	deletingId: ProfileAccountActionsState["deletingId"];
	headshotEditingId: ProfileHeadshotActionsState["headshotEditingId"];
	headshotSavingId: ProfileHeadshotActionsState["headshotSavingId"];
	headshotErrors: ProfileHeadshotActionsState["headshotErrors"];
	handleDeleteAccount: ProfileAccountActionsState["handleDeleteAccount"];
	handleRefreshStats: ProfileAccountActionsState["handleRefreshStats"];
	handleStartVerification: ProfileVerificationActionsState["handleStartVerification"];
	handleVerifyAccount: ProfileVerificationActionsState["handleVerifyAccount"];
	handleCancelVerification: ProfileVerificationActionsState["handleCancelVerification"];
	handleHeadshotCapture: ProfileHeadshotActionsState["handleHeadshotCapture"];
	toggleHeadshotEditing: ProfileHeadshotActionsState["toggleHeadshotEditing"];
};

export function ProfileAccountCard({
	account,
	dateFormatter,
	numberFormatter,
	accountStatsMap,
	headshotByAccountId,
	verificationState,
	refreshingStatsId,
	deletingId,
	headshotEditingId,
	headshotSavingId,
	headshotErrors,
	handleDeleteAccount,
	handleRefreshStats,
	handleStartVerification,
	handleVerifyAccount,
	handleCancelVerification,
	handleHeadshotCapture,
	toggleHeadshotEditing,
}: ProfileAccountCardProps) {
	const status = (account.verificationStatus ??
		"unverified") as VerificationStatus;
	const statusLabel = statusLabels[status];
	const accountState = verificationState[account._id] ?? {};
	const challenge = accountState.challenge ?? account.verificationChallenge;
	const canStart = status !== "verified";
	const canCancel = status === "pending";
	const instructions = accountState.instructions;
	const fallbackInstructions =
		status === "pending"
			? "Use the task you were given earlier. Refresh to pull the exact instructions again."
			: "Start verification to receive a single XP task you can complete in-game.";
	const instructionText = instructions ?? fallbackInstructions;
	const result = accountState.result;
	const verifiedAt = account.lastVerifiedAt
		? dateFormatter.format(new Date(account.lastVerifiedAt))
		: null;
	const statsEntry = accountStatsMap.get(account._id);
	const statsSummary = statsEntry?.summary;
	const statsUpdatedLabel = statsEntry?.lastUpdated
		? dateFormatter.format(new Date(statsEntry.lastUpdated))
		: "Not fetched yet";
	const isStatsStale = statsEntry?.isStale ?? true;
	const isRefreshingStats = refreshingStatsId === account._id;
	const isHeadshotOpen = headshotEditingId === account._id;
	const isHeadshotSaving = headshotSavingId === account._id;
	const headshotError = headshotErrors[account._id];
	const headshotUrl = headshotByAccountId.get(account._id) ?? null;
	const hasHeadshot = Boolean(headshotUrl);

	return (
		<ProfileVerificationWindowState challenge={challenge} result={result}>
			{({ remainingMs, isExpired }) => {
				const canVerify =
					status === "pending" && Boolean(challenge) && !isExpired;
				const startLabel =
					status === "pending"
						? isExpired
							? "New Task"
							: "Refresh Task"
						: "Start Verification";
				const resultMessage = (() => {
					if (!result) return null;
					if (result.status === "verified") {
						return `Verified. Gained ${numberFormatter.format(result.deltaXp)} XP (target ${numberFormatter.format(result.expectedXp)}).`;
					}
					if (result.status === "expired") {
						return "Challenge expired. Start a new verification task.";
					}
					const timeLabel =
						remainingMs !== undefined
							? formatRemaining(remainingMs)
							: "a few minutes";
					return `Hiscores not updated yet. ${numberFormatter.format(result.deltaXp)} / ${numberFormatter.format(result.expectedXp)} XP logged. Try again within ${timeLabel}.`;
				})();

				return (
					<div className="profile-account-card">
						<div className="profile-account-header">
							<div className="profile-account-identity">
								<ProfileAccountAvatar
									headshotUrl={headshotUrl}
									username={account.username}
								/>
								<div>
									<p className="profile-account-name">{account.username}</p>
									{status === "verified" ? (
										<Tooltip>
											<TooltipTrigger
												className={`account-status account-status-${status}`}
											>
												<ShieldCheck className="h-3.5 w-3.5" />
												{statusLabel}
											</TooltipTrigger>
											<TooltipContent>
												{verifiedAt
													? `Verified on ${verifiedAt}`
													: "Verified account"}
											</TooltipContent>
										</Tooltip>
									) : (
										<span className={`account-status account-status-${status}`}>
											{status === "pending" ? (
												<ShieldAlert className="h-3.5 w-3.5" />
											) : (
												<ShieldQuestion className="h-3.5 w-3.5" />
											)}
											{statusLabel}
										</span>
									)}
								</div>
							</div>
							<div className="profile-account-actions">
								<Button
									variant="secondary"
									className="profile-secondary profile-headshot-button"
									disabled={isHeadshotSaving}
									onClick={() => toggleHeadshotEditing(account._id)}
								>
									<Camera className="h-4 w-4" />
									{isHeadshotOpen
										? "Hide Headshot"
										: hasHeadshot
											? "Update Headshot"
											: "Add Headshot"}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="profile-remove"
									aria-label={`Remove ${account.username}`}
									disabled={deletingId === account._id}
									onClick={() =>
										handleDeleteAccount(account._id, account.username)
									}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
						{isHeadshotOpen && (
							<div className="profile-headshot-panel">
								<div className="profile-headshot-header">
									<div>
										<p className="profile-headshot-title">Headshot capture</p>
										<p className="profile-headshot-subtitle">
											Frame your character and capture a fresh badge image.
										</p>
									</div>
									{isHeadshotSaving && (
										<span className="profile-headshot-status">Saving...</span>
									)}
								</div>
								{headshotError && (
									<div className="profile-headshot-error">{headshotError}</div>
								)}
								<Suspense
									fallback={
										<div className="profile-loading">
											<Loader2 className="h-5 w-5 animate-spin" />
											<span>Loading headshot tools...</span>
										</div>
									}
								>
									<HeadshotSelector
										username={account.username}
										onComplete={(imageData) =>
											handleHeadshotCapture(account._id, imageData)
										}
									/>
								</Suspense>
							</div>
						)}
						{status !== "verified" && (
							<div className="profile-verification-panel">
								<div className="profile-verification-header">
									<div>
										<p className="profile-verification-eyebrow">
											Verification Task
										</p>
										<p className="profile-verification-title">
											{isExpired
												? "Challenge expired"
												: status === "pending"
													? "Complete the action below"
													: "Start verification to unlock invites"}
										</p>
									</div>
									<span
										className={`profile-verification-badge profile-verification-badge-${status}`}
									>
										{status === "pending" ? (
											<Clock3 className="h-3.5 w-3.5" />
										) : (
											<Sparkles className="h-3.5 w-3.5" />
										)}
										{statusLabel}
									</span>
								</div>
								<div className="profile-verification-body">
									<p className="profile-verification-instructions">
										{instructionText}
									</p>
									{challenge && (
										<div className="profile-verification-meta">
											<span>Skill: {formatSkillLabel(challenge.skill)}</span>
											<span>
												Target XP:{" "}
												{numberFormatter.format(challenge.expectedXp)}
											</span>
											{remainingMs !== undefined && !isExpired && (
												<span>Window: {formatRemaining(remainingMs)}</span>
											)}
										</div>
									)}
									<div className="profile-verification-actions">
										{canStart && (
											<Button
												className="profile-primary profile-verify-button"
												disabled={accountState.isStarting}
												onClick={() => handleStartVerification(account._id)}
											>
												{accountState.isStarting ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Sparkles className="h-4 w-4" />
												)}
												{accountState.isStarting ? "Starting..." : startLabel}
											</Button>
										)}
										<Button
											variant="secondary"
											className="profile-secondary profile-verify-secondary"
											disabled={!canVerify || accountState.isVerifying}
											onClick={() => handleVerifyAccount(account._id)}
										>
											{accountState.isVerifying ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : isExpired ? (
												<RefreshCw className="h-4 w-4" />
											) : (
												<Clock3 className="h-4 w-4" />
											)}
											{accountState.isVerifying ? "Checking..." : "Verify Now"}
										</Button>
										{canCancel && (
											<Button
												variant="ghost"
												className="profile-secondary profile-verify-cancel"
												disabled={
													accountState.isCanceling || accountState.isVerifying
												}
												onClick={() => handleCancelVerification(account._id)}
											>
												{accountState.isCanceling ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<X className="h-4 w-4" />
												)}
												{accountState.isCanceling ? "Canceling..." : "Cancel"}
											</Button>
										)}
									</div>
									{(resultMessage || (isExpired && !result)) && (
										<div
											className={`profile-verification-result profile-verification-result-${result?.status ?? "expired"}`}
										>
											{resultMessage ??
												"Challenge expired. Start a new verification task."}
										</div>
									)}
									{accountState.error && (
										<div className="profile-verification-error">
											{accountState.error}
										</div>
									)}
								</div>
							</div>
						)}
						<div className="profile-stats-panel">
							<div className="profile-stats-header">
								<div>
									<p className="profile-stats-eyebrow">Hiscores snapshot</p>
									<p className="profile-stats-title">Combat snapshot</p>
								</div>
								<Button
									variant="secondary"
									className="profile-secondary profile-stats-refresh"
									disabled={isRefreshingStats}
									onClick={() => handleRefreshStats(account._id)}
								>
									{isRefreshingStats ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="h-4 w-4" />
									)}
									{isRefreshingStats ? "Refreshing..." : "Refresh"}
								</Button>
							</div>
							{statsSummary ? (
								<div className="profile-stats-body">
									<div className="profile-stats-metrics">
										<div className="profile-stats-metric">
											<span>Combat</span>
											<strong>
												{numberFormatter.format(statsSummary.combatLevel)}
											</strong>
										</div>
										<div className="profile-stats-metric">
											<span>Total</span>
											<strong>
												{numberFormatter.format(statsSummary.totalLevel)}
											</strong>
										</div>
									</div>
									<div className="profile-stats-skills">
										{COMBAT_SKILL_LABELS.map((skill) => (
											<div key={skill.key} className="profile-stats-skill">
												<span className="profile-stats-skill-label">
													<img
														src={skill.icon}
														alt={`${skill.label} icon`}
														className="profile-stats-skill-icon"
														loading="lazy"
													/>
													{skill.label}
												</span>
												<strong>
													{numberFormatter.format(
														statsSummary.combatSkills[skill.key] ?? 0,
													)}
												</strong>
											</div>
										))}
									</div>
								</div>
							) : (
								<p className="profile-stats-empty">
									No snapshot yet. Refresh to pull from hiscores.
								</p>
							)}
							<div className="profile-stats-footer">
								<span>Updated {statsUpdatedLabel}</span>
								{isStatsStale && (
									<span className="profile-stats-stale">Stale</span>
								)}
							</div>
						</div>
					</div>
				);
			}}
		</ProfileVerificationWindowState>
	);
}
