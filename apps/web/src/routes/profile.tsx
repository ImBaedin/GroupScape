import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
	Camera,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock3,
	Loader2,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	ShieldQuestion,
	Sparkles,
	Trash2,
	UserPlus,
	X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import HeadshotSelector from "@/components/headshot-selector";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const statusLabels = {
	unverified: "Unverified",
	pending: "Pending",
	verified: "Verified",
};

const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;

type VerificationStatus = keyof typeof statusLabels;

type VerificationChallenge = {
	skill: string;
	expectedXp: number;
	baselineXp: number;
	issuedAt: number;
	resourceId?: string;
	amount?: number;
};

type VerificationResult = {
	status: "verified" | "pending" | "expired";
	deltaXp: number;
	expectedXp: number;
	remainingMs?: number;
};

type VerificationState = {
	instructions?: string;
	challenge?: VerificationChallenge;
	result?: VerificationResult;
	isStarting?: boolean;
	isVerifying?: boolean;
	isCanceling?: boolean;
	error?: string;
};

const formatSkillLabel = (skill: string) =>
	skill ? `${skill[0].toUpperCase()}${skill.slice(1)}` : "";

const getAccountInitials = (username: string) => {
	const base = username.trim();
	if (!base) return "GS";
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0]?.slice(0, 2).toUpperCase();
	}
	return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
};

const formatRemaining = (remainingMs: number) => {
	const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	if (seconds === 0) return `${minutes}m`;
	return `${minutes}m ${seconds}s`;
};

export const Route = createFileRoute("/profile")({
	component: ProfileRoute,
});

function AccountHeadshot({
	accountId,
	username,
}: {
	accountId: Id<"playerAccounts">;
	username: string;
}) {
	const headshotUrl = useQuery(api.playerAccounts.getHeadshotUrl, {
		accountId,
	});
	const initials = getAccountInitials(username);

	return (
		<div
			className={cn(
				"profile-account-avatar",
				headshotUrl ? "profile-account-avatar-image" : undefined,
			)}
		>
			{headshotUrl ? (
				<img src={headshotUrl} alt={`${username} headshot`} />
			) : (
				<span>{initials}</span>
			)}
		</div>
	);
}

function ProfileRoute() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const user = useQuery(api.auth.getCurrentUser);
	const appUser = useQuery(
		api.users.getCurrent,
		isAuthenticated ? {} : undefined,
	);
	const accounts = useQuery(
		api.playerAccounts.list,
		isAuthenticated ? {} : undefined,
	);
	const addAccount = useMutation(api.playerAccounts.add);
	const deleteAccount = useMutation(api.playerAccounts.delete);
	const setActiveAccount = useMutation(api.users.setActiveAccount);
	const cancelVerification = useMutation(api.playerAccounts.cancelVerification);
	const startVerification = useAction(api.verification.start);
	const verifyAccount = useAction(api.verification.verify);
	const saveHeadshot = useAction(api.headshots.saveHeadshot);

	const [username, setUsername] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<Id<"playerAccounts"> | null>(
		null,
	);
	const [activeUpdatingId, setActiveUpdatingId] =
		useState<Id<"playerAccounts"> | null>(null);
	const [headshotEditingId, setHeadshotEditingId] =
		useState<Id<"playerAccounts"> | null>(null);
	const [headshotSavingId, setHeadshotSavingId] =
		useState<Id<"playerAccounts"> | null>(null);
	const [headshotErrors, setHeadshotErrors] = useState<
		Record<string, string | undefined>
	>({});
	const [verificationState, setVerificationState] = useState<
		Record<string, VerificationState>
	>({});
	const [nowMs, setNowMs] = useState(() => Date.now());

	const accountList = accounts ?? [];
	const isAccountsLoading = isAuthenticated && accounts === undefined;
	const userImage = user?.image ?? null;
	const activeAccountId = appUser?.activePlayerAccountId ?? null;
	const activeAccount = activeAccountId
		? (accountList.find((account) => account._id === activeAccountId) ?? null)
		: null;
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
	const shouldTick = useMemo(() => {
		if (!isAuthenticated) return false;
		return accountList.some((account) => {
			const status = (account.verificationStatus ??
				"unverified") as VerificationStatus;
			if (status === "pending") return true;
			const localChallenge = verificationState[account._id]?.challenge;
			return Boolean(localChallenge) && status !== "verified";
		});
	}, [accountList, isAuthenticated, verificationState]);
	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
		[],
	);

	useEffect(() => {
		if (!shouldTick) {
			setNowMs(Date.now());
			return;
		}
		const intervalId = window.setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return () => {
			window.clearInterval(intervalId);
		};
	}, [shouldTick]);

	const updateVerificationState = (
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
	};

	const handleAddAccount = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedUsername = username.trim();
		if (!trimmedUsername) return;

		setIsSubmitting(true);
		try {
			await addAccount({ username: trimmedUsername });
			setUsername("");
			toast.success("Account linked");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to link account";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteAccount = async (
		accountId: Id<"playerAccounts">,
		accountName: string,
	) => {
		const confirmed = window.confirm(
			`Remove ${accountName}? This cannot be undone.`,
		);
		if (!confirmed) return;

		setDeletingId(accountId);
		try {
			await deleteAccount({ accountId });
			toast.success("Account removed");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to remove account";
			toast.error(message);
		} finally {
			setDeletingId(null);
		}
	};

	const handleSetActiveAccount = async (accountId: Id<"playerAccounts">) => {
		if (activeAccountId === accountId) return;
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
			setActiveUpdatingId(null);
		}
	};

	const handleStartVerification = async (accountId: Id<"playerAccounts">) => {
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
				error instanceof Error ? error.message : "Unable to start verification";
			updateVerificationState(accountId, { error: message });
			toast.error(message);
		} finally {
			updateVerificationState(accountId, { isStarting: false });
		}
	};

	const handleVerifyAccount = async (accountId: Id<"playerAccounts">) => {
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
	};

	const handleCancelVerification = async (accountId: Id<"playerAccounts">) => {
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
	};

	const handleHeadshotCapture = async (
		accountId: Id<"playerAccounts">,
		imageData: string,
	) => {
		if (headshotSavingId === accountId) return;
		setHeadshotSavingId(accountId);
		setHeadshotErrors((prev) => ({ ...prev, [accountId]: undefined }));
		try {
			await saveHeadshot({ accountId, imageData });
			toast.success("Headshot saved");
			setHeadshotEditingId(null);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to save headshot";
			setHeadshotErrors((prev) => ({ ...prev, [accountId]: message }));
			toast.error(message);
		} finally {
			setHeadshotSavingId((prev) => (prev === accountId ? null : prev));
		}
	};

	if (isLoading) {
		return (
			<div className="profile-page flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-16">
				<div className="profile-loading">
					<Loader2 className="h-6 w-6 animate-spin" />
					<span>Loading profile...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="profile-page min-h-[calc(100svh-4rem)] px-4 py-16 sm:px-8">
				<div className="profile-shell mx-auto max-w-4xl">
					<Card className="profile-card profile-guest">
						<CardHeader>
							<CardTitle>Claim your adventurer profile</CardTitle>
							<CardDescription>
								Sign in to link your RuneScape accounts and keep party invites
								verified.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap items-center gap-3">
							<Link
								to="/auth"
								className={cn(buttonVariants(), "profile-primary")}
							>
								Sign In
							</Link>
							<Link
								to="/auth"
								search={{ mode: "sign-up" }}
								className={cn(
									buttonVariants({ variant: "secondary" }),
									"profile-secondary",
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

	return (
		<div className="profile-page min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
			<div className="profile-shell mx-auto max-w-6xl">
				<header className="profile-header">
					<div className="profile-header-top">
						<div>
							<p className="profile-eyebrow">Account Vault</p>
							<h1 className="profile-title text-4xl sm:text-5xl">
								Profile & Accounts
							</h1>
						</div>
						<div className="profile-user">
							<span className="profile-user-label">Signed in as</span>
							<div className="profile-user-identity">
								<span className="profile-user-avatar">
									{userImage ? (
										<img
											src={userImage}
											alt={`${user?.name ?? "Adventurer"} avatar`}
										/>
									) : (
										<span>{getAccountInitials(user?.name ?? "Adventurer")}</span>
									)}
								</span>
								<span className="profile-user-name">
									{user?.name ?? "Adventurer"}
								</span>
							</div>
						</div>
					</div>
					<p className="profile-subtitle text-lg text-muted-foreground">
						Link your OSRS accounts, keep them verified, and make sure party
						leaders know exactly who is ready to go.
					</p>
					<div className="profile-stats">
						<div className="profile-stat-card">
							<span className="profile-stat-label">Linked Accounts</span>
							<span className="profile-stat-value">
								{stats ? stats.total : "--"}
							</span>
						</div>
						<div className="profile-stat-card">
							<span className="profile-stat-label">Verified</span>
							<span className="profile-stat-value">
								{stats ? stats.verified : "--"}
							</span>
						</div>
						<div className="profile-stat-card">
							<span className="profile-stat-label">Pending Checks</span>
							<span className="profile-stat-value">
								{stats ? stats.pending : "--"}
							</span>
						</div>
					</div>
				</header>

				<section className="profile-grid">
					<div className="profile-stack">
						<Card className="profile-card">
							<CardHeader>
								<CardTitle>Link a new account</CardTitle>
								<CardDescription>
									Add the OSRS username you want to verify and use for party
									invites.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleAddAccount} className="profile-form">
									<div className="space-y-2">
										<Label htmlFor="username">OSRS Username</Label>
										<Input
											id="username"
											value={username}
											onChange={(event) => setUsername(event.target.value)}
											className="profile-input"
											placeholder="e.g. PartyCaptain"
											required
										/>
									</div>
									<Button
										type="submit"
										className="profile-primary"
										disabled={!username.trim() || isSubmitting}
									>
										<UserPlus className="h-4 w-4" />
										{isSubmitting ? "Linking..." : "Link Account"}
									</Button>
								</form>
							</CardContent>
						</Card>

						<Card className="profile-card profile-guidance">
							<CardHeader>
								<CardTitle>Verification basics</CardTitle>
								<CardDescription>
									Verified accounts unlock party join requests.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="profile-guidance-list">
									<li>Start verification to receive a single XP task.</li>
									<li>
										Complete the task in-game, then re-check within 5 minutes.
									</li>
									<li>Repeat anytime to refresh your verification status.</li>
								</ul>
							</CardContent>
						</Card>
					</div>

					<Card className="profile-card profile-accounts">
						<CardHeader>
							<CardTitle>Linked accounts</CardTitle>
							<CardDescription>
								Manage usernames tied to your GroupScape profile.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{accounts === undefined ? (
								<div className="profile-loading">
									<Loader2 className="h-5 w-5 animate-spin" />
									<span>Fetching accounts...</span>
								</div>
							) : accountList.length === 0 ? (
								<div className="profile-empty">
									<p>No accounts linked yet.</p>
									<p className="text-muted-foreground">
										Add your main OSRS username to get started.
									</p>
								</div>
							) : (
								<div className="profile-account-grid">
									{accountList.map((account) => {
										const status = (account.verificationStatus ??
											"unverified") as VerificationStatus;
										const statusLabel = statusLabels[status];
										const accountState = verificationState[account._id] ?? {};
										const challenge =
											accountState.challenge ?? account.verificationChallenge;
										const now = nowMs;
										const challengeAgeMs = challenge
											? Math.max(0, now - challenge.issuedAt)
											: 0;
										const computedRemainingMs = challenge
											? Math.max(0, VERIFICATION_WINDOW_MS - challengeAgeMs)
											: undefined;
										const resultRemainingMs = accountState.result?.remainingMs;
										const remainingMs =
											resultRemainingMs ?? computedRemainingMs;
										const isExpired = Boolean(
											accountState.result?.status === "expired" ||
												(challenge && remainingMs === 0),
										);
										const canStart = status !== "verified";
										const canVerify =
											status === "pending" && Boolean(challenge) && !isExpired;
										const canCancel = status === "pending";
										const startLabel =
											status === "pending"
												? isExpired
													? "New Task"
													: "Refresh Task"
												: "Start Verification";
										const instructions = accountState.instructions;
										const fallbackInstructions =
											status === "pending"
												? "Use the task you were given earlier. Refresh to pull the exact instructions again."
												: "Start verification to receive a single XP task you can complete in-game.";
										const instructionText =
											instructions ?? fallbackInstructions;
										const result = accountState.result;
										const resultMessage = (() => {
											if (!result) return null;
											if (result.status === "verified") {
												return `Verified. Gained ${numberFormatter.format(
													result.deltaXp,
												)} XP (target ${numberFormatter.format(
													result.expectedXp,
												)}).`;
											}
											if (result.status === "expired") {
												return "Challenge expired. Start a new verification task.";
											}
											const timeLabel =
												remainingMs !== undefined
													? formatRemaining(remainingMs)
													: "a few minutes";
											return `Hiscores not updated yet. ${numberFormatter.format(
												result.deltaXp,
											)} / ${numberFormatter.format(
												result.expectedXp,
											)} XP logged. Try again within ${timeLabel}.`;
										})();
										const verifiedAt = account.lastVerifiedAt
											? dateFormatter.format(new Date(account.lastVerifiedAt))
											: null;
										const isHeadshotOpen = headshotEditingId === account._id;
										const isHeadshotSaving = headshotSavingId === account._id;
										const headshotError = headshotErrors[account._id];
										const hasHeadshot = Boolean(account.accountImageStorageId);
										return (
											<div key={account._id} className="profile-account-card">
												<div className="profile-account-header">
													<div className="profile-account-identity">
														<AccountHeadshot
															accountId={account._id}
															username={account.username}
														/>
														<div>
															<p className="profile-account-name">
																{account.username}
															</p>
															<span
																className={`account-status account-status-${status}`}
															>
																{status === "verified" ? (
																	<ShieldCheck className="h-3.5 w-3.5" />
																) : status === "pending" ? (
																	<ShieldAlert className="h-3.5 w-3.5" />
																) : (
																	<ShieldQuestion className="h-3.5 w-3.5" />
																)}
																{statusLabel}
															</span>
														</div>
													</div>
													<div className="profile-account-actions">
														<Button
															variant="secondary"
															className="profile-secondary profile-headshot-button"
															disabled={isHeadshotSaving}
															onClick={() =>
																setHeadshotEditingId((prev) =>
																	prev === account._id ? null : account._id,
																)
															}
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
																handleDeleteAccount(
																	account._id,
																	account.username,
																)
															}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</div>
												<p className="profile-account-meta">
													Status: {statusLabel}
												</p>
												{isHeadshotOpen && (
													<div className="profile-headshot-panel">
														<div className="profile-headshot-header">
															<div>
																<p className="profile-headshot-title">
																	Headshot capture
																</p>
																<p className="profile-headshot-subtitle">
																	Frame your character and capture a fresh badge
																	image.
																</p>
															</div>
															{isHeadshotSaving && (
																<span className="profile-headshot-status">
																	Saving...
																</span>
															)}
														</div>
														{headshotError && (
															<div className="profile-headshot-error">
																{headshotError}
															</div>
														)}
														<HeadshotSelector
															username={account.username}
															onComplete={(imageData) =>
																handleHeadshotCapture(account._id, imageData)
															}
														/>
													</div>
												)}
												<div className="profile-verification-panel">
													<div className="profile-verification-header">
														<div>
															<p className="profile-verification-eyebrow">
																Verification Task
															</p>
															<p className="profile-verification-title">
																{status === "verified"
																	? "Account ready for party invites"
																	: isExpired
																		? "Challenge expired"
																		: status === "pending"
																			? "Complete the action below"
																			: "Start verification to unlock invites"}
															</p>
														</div>
														<span
															className={`profile-verification-badge profile-verification-badge-${status}`}
														>
															{status === "verified" ? (
																<CheckCircle2 className="h-3.5 w-3.5" />
															) : status === "pending" ? (
																<Clock3 className="h-3.5 w-3.5" />
															) : (
																<Sparkles className="h-3.5 w-3.5" />
															)}
															{statusLabel}
														</span>
													</div>
													{status === "verified" ? (
														<div className="profile-verification-verified">
															<p>
																Verification complete. You can request to join
																parties immediately.
															</p>
															{verifiedAt && (
																<span>Verified on {verifiedAt}</span>
															)}
														</div>
													) : (
														<div className="profile-verification-body">
															<p className="profile-verification-instructions">
																{instructionText}
															</p>
															{challenge && (
																<div className="profile-verification-meta">
																	<span>
																		Skill: {formatSkillLabel(challenge.skill)}
																	</span>
																	<span>
																		Target XP:{" "}
																		{numberFormatter.format(
																			challenge.expectedXp,
																		)}
																	</span>
																	{remainingMs !== undefined && !isExpired && (
																		<span>
																			Window: {formatRemaining(remainingMs)}
																		</span>
																	)}
																</div>
															)}
															<div className="profile-verification-actions">
																{canStart && (
																	<Button
																		className="profile-primary profile-verify-button"
																		disabled={accountState.isStarting}
																		onClick={() =>
																			handleStartVerification(account._id)
																		}
																	>
																		{accountState.isStarting ? (
																			<Loader2 className="h-4 w-4 animate-spin" />
																		) : (
																			<Sparkles className="h-4 w-4" />
																		)}
																		{accountState.isStarting
																			? "Starting..."
																			: startLabel}
																	</Button>
																)}
																<Button
																	variant="secondary"
																	className="profile-secondary profile-verify-secondary"
																	disabled={
																		!canVerify || accountState.isVerifying
																	}
																	onClick={() =>
																		handleVerifyAccount(account._id)
																	}
																>
																	{accountState.isVerifying ? (
																		<Loader2 className="h-4 w-4 animate-spin" />
																	) : isExpired ? (
																		<RefreshCw className="h-4 w-4" />
																	) : (
																		<Clock3 className="h-4 w-4" />
																	)}
																	{accountState.isVerifying
																		? "Checking..."
																		: "Verify Now"}
																</Button>
																{canCancel && (
																	<Button
																		variant="ghost"
																		className="profile-secondary profile-verify-cancel"
																		disabled={
																			accountState.isCanceling ||
																			accountState.isVerifying
																		}
																		onClick={() =>
																			handleCancelVerification(account._id)
																		}
																	>
																		{accountState.isCanceling ? (
																			<Loader2 className="h-4 w-4 animate-spin" />
																		) : (
																			<X className="h-4 w-4" />
																		)}
																		{accountState.isCanceling
																			? "Canceling..."
																			: "Cancel"}
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
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	);
}
