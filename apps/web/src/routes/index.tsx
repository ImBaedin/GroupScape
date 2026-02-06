import { api } from "@GroupScape/backend/convex/_generated/api";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { type FormEvent, useEffect, useMemo } from "react";
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
import { useDebouncedSearchField } from "@/hooks/use-debounced-search-field";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { isAuthenticated } = useConvexAuth();
	const navigate = useNavigate();
	const searchField = useDebouncedSearchField({ delayMs: 250 });
	const metrics = useQuery(api.parties.getHomeMetrics, {});
	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "short",
			}),
		[],
	);
	const trimmedQuery = searchField.value.trim();
	const debouncedTrimmedQuery = searchField.debouncedValue.trim();

	const searchResults = useQuery(
		api.parties.searchActive,
		debouncedTrimmedQuery.length > 1
			? { query: debouncedTrimmedQuery, limit: 6 }
			: "skip",
	);
	const metricsReady = metrics !== undefined;
	const searchReady = trimmedQuery.length > 1;
	const waitingForDebounce = searchReady && searchField.isDebouncing;
	const isSearching =
		searchReady &&
		(waitingForDebounce ||
			(debouncedTrimmedQuery.length > 1 && searchResults === undefined));
	const searchList = searchResults ?? [];

	useEffect(() => {
		if (!isAuthenticated) return;
		void navigate({ to: "/parties", search: { search: "" } });
	}, [isAuthenticated, navigate]);

	if (isAuthenticated) {
		return null;
	}

	const activePartiesMetric = metricsReady
		? numberFormatter.format(metrics.activeParties)
		: "--";
	const activePlayersMetric = metricsReady
		? numberFormatter.format(metrics.activePlayers)
		: "--";
	const totalPartiesMetric = metricsReady
		? numberFormatter.format(metrics.totalParties)
		: "--";
	const totalPlayersMetric = metricsReady
		? numberFormatter.format(metrics.totalPlayers)
		: "--";

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!trimmedQuery) return;
		navigate({
			to: "/parties",
			search: { search: trimmedQuery },
		});
	};

	return (
		<div className="guild-landing min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
			<div className="mx-auto max-w-6xl space-y-14">
				<header className="guild-topbar">
					<div className="flex items-center gap-3">
						<img
							src="/square-logo.jpg"
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
						<Link className="guild-button guild-button-ghost" to="/auth">
							Sign In
						</Link>
						<Link className="guild-button" to="/auth" search={{ mode: "sign-up" }}>
							Sign Up
						</Link>
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
							<Link
								className="guild-button guild-button-secondary"
								to="/parties"
								search={{ search: "" }}
							>
								Create a Party
							</Link>
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
							<CardContent className="flex flex-col gap-3">
								<form
									onSubmit={handleSubmit}
									className="flex flex-col gap-3 sm:flex-row"
								>
									<Input
										className="guild-input"
										placeholder="Search by boss, region, or party name"
										value={searchField.value}
										onChange={(event) => searchField.setValue(event.target.value)}
									/>
									<Button
										type="submit"
										className="guild-button guild-button-primary"
									>
										Find Parties
									</Button>
								</form>
								{searchReady ? (
									<div className="guild-search-results">
										{isSearching ? (
											<div className="guild-search-status">
												Searching active parties...
											</div>
										) : searchList.length === 0 ? (
											<div className="guild-search-status">
												No active parties found.
											</div>
										) : (
											<div className="guild-search-list">
												{searchList.map((party) => {
													const createdAt =
														party.createdAt ?? party._creationTime;
													const updatedAt = party.updatedAt ?? createdAt;
													const memberCount = party.members.filter(
														(member) => member.role !== "leader",
													).length;
													const totalPlayers = memberCount + 1;
													const openSlots = Math.max(
														0,
														party.partySizeLimit - totalPlayers,
													);

													return (
														<Link
															key={party._id}
															to="/party/$partyId"
															params={{ partyId: party._id }}
															className="guild-search-item"
														>
															<div className="guild-search-text">
																<p className="guild-search-title">
																	{party.name}
																</p>
																<p className="guild-search-desc">
																	{party.description?.trim()
																		? party.description
																		: "No description yet. Tap to view details."}
																</p>
															</div>
															<div className="guild-search-meta">
																<span>
																	{numberFormatter.format(openSlots)} slots
																</span>
																<span>
																	{numberFormatter.format(totalPlayers)} players
																</span>
																<span>
																	Updated{" "}
																	{dateFormatter.format(new Date(updatedAt))}
																</span>
															</div>
														</Link>
													);
												})}
											</div>
										)}
									</div>
								) : null}
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
								<span className="guild-stat-value">{activePartiesMetric}</span>
							</div>
							<div className="guild-stat">
								<span className="guild-stat-label">Active Players</span>
								<span className="guild-stat-value">{activePlayersMetric}</span>
							</div>
							<div className="guild-stat">
								<span className="guild-stat-label">Total Parties</span>
								<span className="guild-stat-value">{totalPartiesMetric}</span>
							</div>
							<div className="guild-stat">
								<span className="guild-stat-label">Total Players</span>
								<span className="guild-stat-value">{totalPlayersMetric}</span>
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
						<Link className="guild-button" to="/parties" search={{ search: "" }}>
							Explore Parties
						</Link>
					</div>
				</section>
			</div>
		</div>
	);
}
