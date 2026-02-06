import { Loader2 } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ProfileAccountActionsState } from "../hooks/useProfileAccountActions";
import type { ProfileHeadshotActionsState } from "../hooks/useProfileHeadshotActions";
import type { ProfileQueriesState } from "../hooks/useProfileQueries";
import type { ProfileVerificationActionsState } from "../hooks/useProfileVerificationActions";
import { ProfileAccountCard } from "./ProfileAccountCard";

type ProfileAccountsSectionProps = {
	accounts: ProfileQueriesState["accounts"];
	accountList: ProfileQueriesState["accountList"];
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
	dateFormatter: Intl.DateTimeFormat;
	numberFormatter: Intl.NumberFormat;
};

export function ProfileAccountsSection({
	accounts,
	accountList,
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
	dateFormatter,
	numberFormatter,
}: ProfileAccountsSectionProps) {
	return (
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
						{accountList.map((account) => (
							<ProfileAccountCard
								key={account._id}
								account={account}
								dateFormatter={dateFormatter}
								numberFormatter={numberFormatter}
								accountStatsMap={accountStatsMap}
								headshotByAccountId={headshotByAccountId}
								verificationState={verificationState}
								refreshingStatsId={refreshingStatsId}
								deletingId={deletingId}
								headshotEditingId={headshotEditingId}
								headshotSavingId={headshotSavingId}
								headshotErrors={headshotErrors}
								handleDeleteAccount={handleDeleteAccount}
								handleRefreshStats={handleRefreshStats}
								handleStartVerification={handleStartVerification}
								handleVerifyAccount={handleVerifyAccount}
								handleCancelVerification={handleCancelVerification}
								handleHeadshotCapture={handleHeadshotCapture}
								toggleHeadshotEditing={toggleHeadshotEditing}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
