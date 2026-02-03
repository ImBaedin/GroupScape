import { api } from "@GroupScape/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	DropdownMenu,
	DropdownMenuContent,
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
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>{user?.email}</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									navigate({
										to: "/dashboard",
									});
								},
							},
						});
					}}
				>
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
