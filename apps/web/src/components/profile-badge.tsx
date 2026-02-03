import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

function getInitials(name?: string | null) {
	const base = name?.trim() || "Adventurer";
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0]?.slice(0, 2).toUpperCase();
	}
	return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export default function ProfileBadge() {
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
	const setActiveAccount = useMutation(api.users.setActiveAccount);
	const navigate = useNavigate();
	const [activeUpdatingId, setActiveUpdatingId] = useState<
		Id<"playerAccounts"> | null
	>(null);

	if (isLoading) {
		return <div className="profile-badge profile-badge-loading">Loading...</div>;
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
	const accountList = accounts ?? [];
	const activeAccountId = appUser?.activePlayerAccountId ?? null;
	const activeAccountName =
		accountList.find((account) => account._id === activeAccountId)?.username ??
		"Select account";

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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="profile-badge" type="button">
				<span className="profile-avatar">
					{user?.image ? (
						<img src={user.image} alt={name} />
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
					<DropdownMenuLabel>Signed in</DropdownMenuLabel>
					<DropdownMenuItem disabled>{name}</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Account</DropdownMenuLabel>
					<DropdownMenuItem
						onClick={() => {
							navigate({ to: "/profile" });
						}}
					>
						Profile
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Active account</DropdownMenuLabel>
					{accountList.length === 0 ? (
						<DropdownMenuItem disabled>Add an account first</DropdownMenuItem>
					) : (
						accountList.map((account) => (
							<DropdownMenuItem
								key={account._id}
								onClick={() => handleSetActiveAccount(account._id)}
								disabled={activeUpdatingId !== null}
								className="justify-between"
							>
								<span>{account.username}</span>
								{activeAccountId === account._id && (
									<Check className="h-4 w-4" />
								)}
							</DropdownMenuItem>
						))
					)}
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
