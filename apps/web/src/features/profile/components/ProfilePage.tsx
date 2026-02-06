import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useProfileAccountActions } from "../hooks/useProfileAccountActions";
import { useProfileHeadshotActions } from "../hooks/useProfileHeadshotActions";
import { useProfileQueries } from "../hooks/useProfileQueries";
import { useProfileVerificationActions } from "../hooks/useProfileVerificationActions";
import { ProfileAccountLinkForm } from "./ProfileAccountLinkForm";
import { ProfileAccountsSection } from "./ProfileAccountsSection";
import { ProfileGuidanceCard } from "./ProfileGuidanceCard";
import { ProfileHeader } from "./ProfileHeader";

export function ProfilePage() {
	const queryState = useProfileQueries();
	const accountActions = useProfileAccountActions();
	const verificationActions = useProfileVerificationActions();
	const headshotActions = useProfileHeadshotActions();

	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
		[],
	);

	if (queryState.isLoading) {
		return (
			<div className="profile-page flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-16">
				<div className="profile-loading">
					<Loader2 className="h-6 w-6 animate-spin" />
					<span>Loading profile...</span>
				</div>
			</div>
		);
	}

	if (!queryState.isAuthenticated) {
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
							<Link to="/auth" className={cn(buttonVariants(), "profile-primary")}>
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
				<ProfileHeader
					user={queryState.user}
					partyLock={queryState.partyLock}
					stats={queryState.stats}
				/>

				<section className="profile-grid">
					<div className="profile-stack">
						<ProfileAccountLinkForm
							username={accountActions.username}
							setUsername={accountActions.setUsername}
							isSubmitting={accountActions.isSubmitting}
							handleAddAccount={accountActions.handleAddAccount}
						/>
						<ProfileGuidanceCard />
					</div>

					<ProfileAccountsSection
						accounts={queryState.accounts}
						accountList={queryState.accountList}
						accountStatsMap={queryState.accountStatsMap}
						headshotByAccountId={queryState.headshotByAccountId}
						verificationState={verificationActions.verificationState}
						refreshingStatsId={accountActions.refreshingStatsId}
						deletingId={accountActions.deletingId}
						headshotEditingId={headshotActions.headshotEditingId}
						headshotSavingId={headshotActions.headshotSavingId}
						headshotErrors={headshotActions.headshotErrors}
						handleDeleteAccount={accountActions.handleDeleteAccount}
						handleRefreshStats={accountActions.handleRefreshStats}
						handleStartVerification={verificationActions.handleStartVerification}
						handleVerifyAccount={verificationActions.handleVerifyAccount}
						handleCancelVerification={verificationActions.handleCancelVerification}
						handleHeadshotCapture={headshotActions.handleHeadshotCapture}
						toggleHeadshotEditing={headshotActions.toggleHeadshotEditing}
						dateFormatter={dateFormatter}
						numberFormatter={numberFormatter}
					/>
				</section>
			</div>
		</div>
	);
}
