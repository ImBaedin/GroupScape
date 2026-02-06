import type { ProfileQueriesState } from "../hooks/useProfileQueries";
import { getAccountInitials } from "../lib/profile-view";

type ProfileHeaderProps = {
	user: ProfileQueriesState["user"];
	partyLock: ProfileQueriesState["partyLock"];
	stats: ProfileQueriesState["stats"];
};

export function ProfileHeader({ user, partyLock, stats }: ProfileHeaderProps) {
	const userImage = user?.image ?? null;
	const partyLockMessage = partyLock
		? partyLock.membershipStatus === "pending"
			? `Account switching is locked while your "${partyLock.name}" request is pending.`
			: `Account switching is locked while you are in "${partyLock.name}".`
		: null;

	return (
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
								<img src={userImage} alt={`${user?.name ?? "Adventurer"} avatar`} />
							) : (
								<span>{getAccountInitials(user?.name ?? "Adventurer")}</span>
							)}
						</span>
						<span className="profile-user-name">{user?.name ?? "Adventurer"}</span>
					</div>
				</div>
			</div>
			<p className="profile-subtitle text-lg text-muted-foreground">
				Link your OSRS accounts, keep them verified, and make sure party leaders
				know exactly who is ready to go.
			</p>
			{partyLockMessage ? (
				<p className="text-sm text-destructive">{partyLockMessage}</p>
			) : null}
			<div className="profile-stats">
				<div className="profile-stat-card">
					<span className="profile-stat-label">Linked Accounts</span>
					<span className="profile-stat-value">{stats ? stats.total : "--"}</span>
				</div>
				<div className="profile-stat-card">
					<span className="profile-stat-label">Verified</span>
					<span className="profile-stat-value">
						{stats ? stats.verified : "--"}
					</span>
				</div>
				<div className="profile-stat-card">
					<span className="profile-stat-label">Pending Checks</span>
					<span className="profile-stat-value">{stats ? stats.pending : "--"}</span>
				</div>
			</div>
		</header>
	);
}
