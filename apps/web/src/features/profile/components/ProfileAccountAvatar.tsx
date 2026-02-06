import { cn } from "@/lib/utils";
import { getAccountInitials } from "../lib/profile-view";

export function ProfileAccountAvatar({
	headshotUrl,
	username,
}: {
	headshotUrl?: string | null;
	username: string;
}) {
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
