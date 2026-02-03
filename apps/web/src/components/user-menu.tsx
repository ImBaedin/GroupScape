import { api } from "@GroupScape/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
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
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";

export default function UserMenu() {
	const navigate = useNavigate();
	const user = useQuery(api.auth.getCurrentUser);

	return (
		<DropdownMenu>
		<DropdownMenuTrigger
			type="button"
			className={cn(buttonVariants({ variant: "outline" }))}
		>
			{user?.name ?? "Account"}
		</DropdownMenuTrigger>
		<DropdownMenuContent className="bg-card">
			<DropdownMenuGroup>
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuItem>{user?.email}</DropdownMenuItem>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuItem
					variant="destructive"
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									navigate({
										to: "/auth",
									});
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
