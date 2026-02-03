import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="runescape-landing min-h-[calc(100svh-4rem)] px-4 pb-16 pt-10 sm:px-8">
			<div className="mx-auto max-w-6xl">
				<section className="runescape-hero grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
					<div className="space-y-6">
						<p className="runescape-eyebrow">GroupScape Party Tracker</p>
						<h1 className="runescape-title text-4xl sm:text-5xl lg:text-6xl">
							Adventuring is better together.
						</h1>
						<p className="runescape-lede text-lg text-muted-foreground">
							GroupScape helps you discover active parties, coordinate your
							clanmates, and keep every raid on schedule. Find a party in
							seconds, then keep the group synced with a RuneLite plugin that
							updates as you play.
						</p>
						<div className="flex flex-wrap items-center gap-4">
							<a className="runescape-button" href="#">
								Download RuneLite Plugin
							</a>
							<Button
								variant="secondary"
								className="runescape-button runescape-button-secondary"
							>
								Create a Party
							</Button>
						</div>
						<div className="runescape-search">
							<label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Search active parties
							</label>
							<div className="mt-3 flex flex-col gap-3 sm:flex-row">
								<Input
									className="runescape-input"
									placeholder="Search by boss, region, or party name"
								/>
								<Button className="runescape-button runescape-button-primary">
									Find Parties
								</Button>
							</div>
						</div>
					</div>
					<Card className="runescape-panel space-y-6">
						<CardHeader className="runescape-panel-header">
							<p className="text-xs font-semibold uppercase tracking-[0.3em]">
								Live Stats
							</p>
							<CardTitle className="runescape-panel-title text-2xl">
								World Snapshot
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4">
							<div className="runescape-stat">
								<span className="runescape-stat-label">Active Parties</span>
								<span className="runescape-stat-value">42</span>
							</div>
							<div className="runescape-stat">
								<span className="runescape-stat-label">Active Players</span>
								<span className="runescape-stat-value">137</span>
							</div>
							<div className="runescape-stat">
								<span className="runescape-stat-label">Total Parties</span>
								<span className="runescape-stat-value">5,248</span>
							</div>
							<div className="runescape-stat">
								<span className="runescape-stat-label">Total Players</span>
								<span className="runescape-stat-value">18,903</span>
							</div>
						</CardContent>
						<Separator className="runescape-divider" />
						<CardContent className="pt-0">
							<ul className="space-y-4 text-sm text-muted-foreground">
								<li>
									<span className="text-foreground">Party alerts:</span> get
									notified when your preferred raid opens.
								</li>
								<li>
									<span className="text-foreground">Live syncing:</span> the
									RuneLite plugin keeps your party roster current.
								</li>
								<li>
									<span className="text-foreground">Invite links:</span> share one
									link for immediate join and voice handoff.
								</li>
							</ul>
						</CardContent>
					</Card>
				</section>

				<section className="runescape-grid mt-14 grid gap-6 lg:grid-cols-3">
					<Card className="runescape-card">
						<CardHeader>
							<CardTitle className="runescape-card-title">
								1. Find Your Party
							</CardTitle>
							<CardDescription>
								Search by raid, minigame, or clan. Filters surface parties by
								timezone, world, and preferred role.
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="runescape-card">
						<CardHeader>
							<CardTitle className="runescape-card-title">
								2. Sync With RuneLite
							</CardTitle>
							<CardDescription>
								The plugin updates your party roster as you hop worlds or swap
								loadouts. Everyone stays aligned.
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="runescape-card">
						<CardHeader>
							<CardTitle className="runescape-card-title">
								3. Keep the Raid Moving
							</CardTitle>
							<CardDescription>
								Post live notes, swap leader roles, and check readiness without
								leaving the game.
							</CardDescription>
						</CardHeader>
					</Card>
				</section>

				<section className="runescape-footer mt-12">
					<div>
						<h2 className="runescape-footer-title text-2xl">
							Why GroupScape?
						</h2>
						<p className="text-sm text-muted-foreground">
							Built for clans who want clarity without chaos. GroupScape gives
							you a single place to coordinate, a plugin that keeps you synced,
							and stats that show the world is alive.
						</p>
					</div>
					<div className="runescape-footer-actions">
						<Button
							variant="secondary"
							className="runescape-button runescape-button-secondary"
						>
							Start a Party
						</Button>
						<Button className="runescape-button">Explore Parties</Button>
					</div>
				</section>
			</div>
		</div>
	);
}
