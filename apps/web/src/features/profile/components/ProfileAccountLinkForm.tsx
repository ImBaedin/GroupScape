import type { ProfileAccountActionsState } from "../hooks/useProfileAccountActions";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileAccountLinkFormProps = {
	username: ProfileAccountActionsState["username"];
	setUsername: ProfileAccountActionsState["setUsername"];
	isSubmitting: ProfileAccountActionsState["isSubmitting"];
	handleAddAccount: ProfileAccountActionsState["handleAddAccount"];
};

export function ProfileAccountLinkForm({
	username,
	setUsername,
	isSubmitting,
	handleAddAccount,
}: ProfileAccountLinkFormProps) {
	return (
		<Card className="profile-card">
			<CardHeader>
				<CardTitle>Link a new account</CardTitle>
				<CardDescription>
					Add the OSRS username you want to verify and use for party invites.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleAddAccount} className="profile-form">
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
	);
}
