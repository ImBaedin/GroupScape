import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useMemo } from "react";
import { Check, ShieldCheck, User, UserPlus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveAccountSwitcher } from "@/hooks/use-active-account-switcher";
import { authClient } from "@/lib/auth-client";

function getInitials(name?: string | null) {
	const base = name?.trim() || "Adventurer";
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0]?.slice(0, 2).toUpperCase();
	}
	return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function AccountRow({
	account,
	headshotUrl,
	isActive,
	onSelect,
	disabled,
}: {
	account: {
		_id: Id<"playerAccounts">;
		username: string;
		verificationStatus?: "unverified" | "pending" | "verified";
	};
	headshotUrl?: string | null;
	isActive: boolean;
	onSelect: (accountId: Id<"playerAccounts">) => void;
	disabled: boolean;
}) {
	const initials = getInitials(account.username);
	const isVerified = account.verificationStatus === "verified";

	return (
		<DropdownMenuItem
			onClick={() => onSelect(account._id)}
			disabled={disabled}
			className="profile-account-item"
		>
			<span className="profile-account-avatar-sm">
				{headshotUrl ? (
					<img src={headshotUrl} alt={`${account.username} headshot`} />
				) : (
					<span>{initials}</span>
				)}
			</span>
			<span className="profile-account-info">
				<span className="profile-account-name-sm">{account.username}</span>
				<span className="profile-account-status-sm">
					{isVerified ? "Verified" : "Unverified"}
				</span>
			</span>
			{isVerified && (
				<ShieldCheck className="profile-account-verified h-4 w-4" />
			)}
			{isActive && <Check className="profile-account-active h-4 w-4" />}
		</DropdownMenuItem>
	);
}

export default function ProfileBadge() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const user = useQuery(api.auth.getCurrentUser);
	const appUser = useQuery(
		api.users.getCurrent,
		isAuthenticated ? {} : "skip",
	);
	const accounts = useQuery(
		api.playerAccounts.list,
		isAuthenticated ? {} : "skip",
	);
	const partyLock = useQuery(
		api.parties.getActiveForUser,
		isAuthenticated ? {} : "skip",
	);
	const accountList = accounts ?? [];
	const accountIds = useMemo(
		() => accountList.map((account) => account._id),
		[accountList],
	);
	const memberProfiles = useQuery(
		api.playerAccounts.getMemberProfiles,
		isAuthenticated && accountIds.length > 0 ? { accountIds } : "skip",
	);
	const headshotByAccountId = useMemo(
		() =>
			new Map(
				(memberProfiles ?? []).map((profile) => [
					profile.accountId,
					profile.headshotUrl ?? null,
				]),
			),
		[memberProfiles],
	);

	const navigate = useNavigate();
	const activeAccountId = appUser?.activePlayerAccountId ?? null;
	const isPartyLockLoading = isAuthenticated && partyLock === undefined;
	const isPartyLocked = isPartyLockLoading || Boolean(partyLock);
	const { activeUpdatingId, handleSetActiveAccount } = useActiveAccountSwitcher(
		{
			activeAccountId: activeAccountId ?? null,
			isPartyLocked,
		},
	);

	if (isLoading) {
		return (
			<div className="profile-badge profile-badge-loading">Loading...</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<Link className="header-signin" to="/auth">
				Sign In
			</Link>
		);
	}

	const name = user?.name ?? "Adventurer";
	const initials = getInitials(user?.name);
	const lockMessage = partyLock
		? partyLock.membershipStatus === "pending"
			? `Pending party request in ${partyLock.name}`
			: `In party: ${partyLock.name}`
		: null;
	const activeAccountName =
		accountList.find((account) => account._id === activeAccountId)?.username ??
		"Select account";
	const activeHeadshotUrl = activeAccountId
		? headshotByAccountId.get(activeAccountId) ?? null
		: null;
	const profileImage = activeHeadshotUrl ?? user?.image ?? null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="profile-badge" type="button">
				<span className="profile-avatar">
					{profileImage ? (
						<img
							src={profileImage}
							alt={activeHeadshotUrl ? `${activeAccountName} headshot` : name}
						/>
					) : (
						<span>{initials}</span>
					)}
				</span>
				<span className="profile-meta">
					<span className="profile-name">{name}</span>
					<span className="profile-email">{activeAccountName}</span>
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="profile-menu" align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Switch active account</DropdownMenuLabel>
					{accountList.length === 0 ? (
						<DropdownMenuItem disabled>Add an account first</DropdownMenuItem>
					) : (
						accountList.map((account) => (
							<AccountRow
								key={account._id}
								account={account}
								headshotUrl={headshotByAccountId.get(account._id)}
								isActive={activeAccountId === account._id}
								onSelect={handleSetActiveAccount}
								disabled={activeUpdatingId !== null || isPartyLocked}
							/>
						))
					)}
					{lockMessage ? (
						<DropdownMenuItem disabled>{lockMessage}</DropdownMenuItem>
					) : null}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={() => {
							navigate({ to: "/profile" });
						}}
					>
						<User className="h-4 w-4" />
						Profile
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							navigate({ to: "/profile" });
						}}
					>
						<UserPlus className="h-4 w-4" />
						Link new account
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({ to: "/auth" });
									},
								},
							});
						}}
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
