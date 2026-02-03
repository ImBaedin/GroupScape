import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/parties")({
	component: PartiesRoute,
});

function PartiesRoute() {
	return (
		<div className="party-landing min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
			<div className="party-shell mx-auto max-w-6xl">
				<header className="party-header">
					<p className="party-eyebrow">Party Finder</p>
					<h1 className="party-title text-4xl sm:text-5xl">
						Find a party, lock in your role.
					</h1>
					<p className="party-lede text-lg text-muted-foreground">
						Search active parties, view leader notes, and jump straight into a
						RuneLite-synced roster.
					</p>
				</header>

				<div className="party-search">
					<Input
						className="party-input"
						placeholder="Search by boss, minigame, or region"
					/>
					<Button className="party-button">Search Parties</Button>
				</div>

				<section className="party-grid">
					<div className="party-card">
						<h3>Boss Runs</h3>
						<p>High-intensity groups with live role tracking and invites.</p>
					</div>
					<div className="party-card">
						<h3>Skilling Crews</h3>
						<p>Chill sessions that stay in sync while you grind.</p>
					</div>
					<div className="party-card">
						<h3>Questing Squads</h3>
						<p>Coordinate quest steps with a real-time checklist.</p>
					</div>
				</section>
			</div>
		</div>
	);
}
