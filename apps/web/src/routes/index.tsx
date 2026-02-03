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
		<div className="guild-landing min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
			<div className="mx-auto max-w-6xl space-y-14">
				<header className="guild-topbar">
					<div className="flex items-center gap-3">
						<img
							src="/logo.png"
							alt="GroupScape"
							className="h-10 w-10 rounded-full border border-border/60"
						/>
						<div>
							<p className="guild-brand">GroupScape</p>
							<p className="guild-brand-sub">
								Finding a team isn't easy, but can be easier
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<a className="guild-button guild-button-ghost" href="/auth">
							Sign In
						</a>
						<a className="guild-button" href="/auth?mode=sign-up">
							Sign Up
						</a>
					</div>
				</header>

				<section className="guild-hero grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
					<div className="space-y-6">
						<p className="guild-eyebrow">GroupScape Party Tracker</p>
						<h1 className="guild-title text-4xl sm:text-5xl lg:text-6xl">
							Coordinate any in-game activity with clarity.
						</h1>
						<p className="guild-lede text-lg text-muted-foreground">
							GroupScape keeps every party synced: discover active teams for
							bosses, minigames, skilling, and quests, then stay aligned with a
							RuneLite plugin that updates as you play.
						</p>
						<div className="flex flex-wrap items-center gap-4">
							<a className="guild-button guild-button-primary" href="#">
								Download RuneLite Plugin
							</a>
							<a
								className="guild-button guild-button-secondary"
								href="/parties"
							>
								Create a Party
							</a>
						</div>

						<Card className="guild-search">
							<CardHeader className="pb-2">
								<CardTitle className="guild-card-title text-lg">
									Find a party fast
								</CardTitle>
								<CardDescription>
									Search by boss, minigame, skilling, or party name. We surface
									the best match for your time and role.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3 sm:flex-row">
								<Input
									className="guild-input"
									placeholder="Search by boss, region, or party name"
								/>
								<Button className="guild-button guild-button-primary">
									Find Parties
								</Button>
							</CardContent>
						</Card>
					</div>

					<Card className="guild-panel">
						<CardHeader className="guild-panel-header">
							<p className="guild-eyebrow text-[0.6rem]">Live Stats</p>
							<CardTitle className="guild-panel-title text-2xl">
								World Snapshot
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							<div className="guild-stat">
								<span className="guild-stat-label">Active Parties</span>
								<span className="guild-stat-value">42</span>
							</div>
							<div className="guild-stat">
								<span className="guild-stat-label">Active Players</span>
								<span className="guild-stat-value">137</span>
							</div>
							<div className="guild-stat">
								<span className="guild-stat-label">Total Parties</span>
								<span className="guild-stat-value">5,248</span>
							</div>
							<div className="guild-stat">
								<span className="guild-stat-label">Total Players</span>
								<span className="guild-stat-value">18,903</span>
							</div>
						</CardContent>
						<Separator className="guild-divider" />
						<CardContent className="pt-0">
							<ul className="guild-help grid gap-3 text-muted-foreground text-sm">
								<li>
									<span className="text-foreground">Party alerts:</span> get
									pinged the moment a group opens.
								</li>
								<li>
									<span className="text-foreground">Live syncing:</span> the
									RuneLite plugin keeps rosters accurate.
								</li>
								<li>
									<span className="text-foreground">Shareable invites:</span>{" "}
									send a single link for instant join.
								</li>
							</ul>
						</CardContent>
					</Card>
				</section>

				<section className="guild-grid grid gap-6 lg:grid-cols-3">
					<Card className="guild-card">
						<CardHeader>
							<CardTitle className="guild-card-title">
								1. Scout Your Party
							</CardTitle>
							<CardDescription>
								Filter by activity, region, or role. See who is ready before you
								commit.
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="guild-card">
						<CardHeader>
							<CardTitle className="guild-card-title">
								2. Sync With RuneLite
							</CardTitle>
							<CardDescription>
								Roster updates land in real time as members hop worlds or swap
								loadouts.
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="guild-card">
						<CardHeader>
							<CardTitle className="guild-card-title">
								3. Keep the Run Moving
							</CardTitle>
							<CardDescription>
								Capture notes, keep roles aligned, and hand off leadership
								without leaving the game.
							</CardDescription>
						</CardHeader>
					</Card>
				</section>

				<section className="guild-footer">
					<div>
						<h2 className="guild-footer-title text-2xl">
							Built for every party
						</h2>
						<p className="text-muted-foreground text-sm">
							GroupScape brings order to the chaos. Track every activity, keep
							the plugin synced, and always know who is ready.
						</p>
					</div>
					<div className="guild-footer-actions">
						<Button
							variant="secondary"
							className="guild-button guild-button-secondary"
						>
							Start a Party
						</Button>
						<a className="guild-button" href="/parties">
							Explore Parties
						</a>
					</div>
				</section>
			</div>
		</div>
	);
}
