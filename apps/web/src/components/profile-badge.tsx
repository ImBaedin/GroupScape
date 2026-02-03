import { api } from "@GroupScape/backend/convex/_generated/api";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
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

function getInitials(name?: string | null, email?: string | null) {
	const base = name?.trim() || email?.split("@")[0] || "Adventurer";
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0]?.slice(0, 2).toUpperCase();
	}
	return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export default function ProfileBadge() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const user = useQuery(api.auth.getCurrentUser);
	const navigate = useNavigate();

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
	const email = user?.email ?? "Signed in";
	const initials = getInitials(user?.name, user?.email);

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
					<span className="profile-email">{email}</span>
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="profile-menu" align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Signed in</DropdownMenuLabel>
					<DropdownMenuItem disabled>{email}</DropdownMenuItem>
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
