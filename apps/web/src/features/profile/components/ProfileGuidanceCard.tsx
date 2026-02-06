import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function ProfileGuidanceCard() {
	return (
		<Card className="profile-card profile-guidance">
			<CardHeader>
				<CardTitle>Verification basics</CardTitle>
				<CardDescription>
					Verified accounts unlock party join requests.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="profile-guidance-list">
					<li>Start verification to receive a single XP task.</li>
					<li>Complete the task in-game, then re-check within 5 minutes.</li>
					<li>Repeat anytime to refresh your verification status.</li>
				</ul>
			</CardContent>
		</Card>
	);
}
