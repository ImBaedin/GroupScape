import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
	Loader2,
	ShieldCheck,
	ShieldQuestion,
	ShieldAlert,
	Trash2,
	UserPlus,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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
import { cn } from "@/lib/utils";

const statusLabels = {
	unverified: "Unverified",
	pending: "Pending",
	verified: "Verified",
};

type VerificationStatus = keyof typeof statusLabels;

export const Route = createFileRoute("/profile")({
	component: ProfileRoute,
});

function ProfileRoute() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const user = useQuery(api.auth.getCurrentUser);
	const accounts = useQuery(
		api.playerAccounts.list,
		isAuthenticated ? {} : undefined,
	);
	const addAccount = useMutation(api.playerAccounts.add);
	const deleteAccount = useMutation(api.playerAccounts.delete);

	const [username, setUsername] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<Id<"playerAccounts"> | null>(
		null,
	);

	const accountList = accounts ?? [];
	const stats = useMemo(() => {
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
	}, [accountList]);

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
		<div className="profile-page min-h-[calc(100svh-4rem)] px-4 pb-20 pt-10 sm:px-8">
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
							<span className="profile-user-name">
								{user?.name ?? "Adventurer"}
							</span>
							<span className="profile-user-email">
								{user?.email ?? "Connected"}
							</span>
						</div>
					</div>
					<p className="profile-subtitle text-lg text-muted-foreground">
						Link your OSRS accounts, keep them verified, and make sure party
						leaders know exactly who is ready to go.
					</p>
					<div className="profile-stats">
						<div className="profile-stat-card">
							<span className="profile-stat-label">Linked Accounts</span>
							<span className="profile-stat-value">{stats.total}</span>
						</div>
						<div className="profile-stat-card">
							<span className="profile-stat-label">Verified</span>
							<span className="profile-stat-value">{stats.verified}</span>
						</div>
						<div className="profile-stat-card">
							<span className="profile-stat-label">Pending Checks</span>
							<span className="profile-stat-value">{stats.pending}</span>
						</div>
					</div>
				</header>

				<section className="profile-grid">
					<div className="profile-stack">
						<Card className="profile-card">
							<CardHeader>
								<CardTitle>Link a new account</CardTitle>
								<CardDescription>
									Add the OSRS username you want to verify and use for
									party invites.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form
									onSubmit={handleAddAccount}
									className="profile-form"
								>
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
									<li>Complete the task in-game, then re-check within 15 minutes.</li>
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
										const status =
											(account.verificationStatus ??
												"unverified") as VerificationStatus;
										const statusLabel = statusLabels[status];
										return (
											<div
												key={account._id}
												className="profile-account-card"
											>
												<div className="profile-account-header">
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
												<p className="profile-account-meta">
													Status: {statusLabel}
												</p>
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
