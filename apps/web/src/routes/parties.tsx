import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Crown, Flag, Loader2, Sparkles, Timer, Users } from "lucide-react";
import { useMemo } from "react";
import CreatePartyForm from "@/components/create-party-form";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parties")({
	component: PartiesRoute,
});

function PartiesRoute() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const appUser = useQuery(
		api.users.getCurrent,
		isAuthenticated ? {} : undefined,
	);
	const parties = useQuery(
		api.parties.list,
		isAuthenticated ? {} : undefined,
	);
	const partyList = parties ?? [];

	const numberFormatter = useMemo(() => new Intl.NumberFormat(), []);
	const dateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
		[],
	);
	const totalPending = useMemo(
		() =>
			partyList.reduce(
				(total, party) =>
					total +
					party.members.filter((member) => member.status === "pending").length,
				0,
			),
		[partyList],
	);
	const totalAccepted = useMemo(
		() =>
			partyList.reduce(
				(total, party) =>
					total +
					party.members.filter((member) => member.status === "accepted")
						.length +
					1,
				0,
			),
		[partyList],
	);

	const formatOwnerLabel = (ownerId: Id<"users">) => {
		if (appUser?._id === ownerId) return "You";
		const compact = ownerId.slice(-4).toUpperCase();
		return `Leader #${compact}`;
	};

	return (
		<div className="party-landing min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
			<div className="party-shell mx-auto max-w-6xl">
				<header className="party-header">
					<p className="party-eyebrow">Party Finder</p>
					<h1 className="party-title text-4xl sm:text-5xl">
						Recruit fast, adventure faster.
					</h1>
					<p className="party-lede text-lg text-muted-foreground">
						Launch a new crew or browse verified parties ready to move. Every
						listing keeps the roster and expectations clear.
					</p>
				</header>

				<section className="party-layout">
					<div className="party-left">
						<Card className="party-callout">
							<CardHeader>
								<CardTitle>Party rules of the road</CardTitle>
								<CardDescription>
									Keep invites clean and expectations sharp.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="party-callout-list">
									<li>
										<Sparkles className="h-4 w-4" />
										Verified accounts jump to the top of every request list.
									</li>
									<li>
										<Flag className="h-4 w-4" />
										Use descriptions to set gear, role, or time expectations.
									</li>
									<li>
										<Timer className="h-4 w-4" />
										Refresh verification every time you switch alts.
									</li>
								</ul>
							</CardContent>
						</Card>

						<div className="party-create">
							{isAuthenticated ? (
								<CreatePartyForm />
							) : (
								<Card className="party-guest">
									<CardHeader>
										<CardTitle>Sign in to create a party</CardTitle>
										<CardDescription>
											Link an account to open your own party board.
										</CardDescription>
									</CardHeader>
									<CardContent className="flex flex-wrap gap-3">
										<Link
											to="/auth"
											className={cn(buttonVariants(), "party-primary")}
										>
											Sign In
										</Link>
										<Link
											to="/auth"
											search={{ mode: "sign-up" }}
											className={cn(
												buttonVariants({ variant: "secondary" }),
												"party-secondary",
											)}
										>
											Create Account
										</Link>
									</CardContent>
								</Card>
							)}
						</div>
					</div>

					<div className="party-right">
						<div className="party-board">
							<div className="party-board-header">
								<div>
									<p className="party-board-eyebrow">Open Parties</p>
									<h2 className="party-board-title text-3xl sm:text-4xl">
										Recruiting right now
									</h2>
									<p className="party-board-sub text-muted-foreground">
										Open listings from verified leaders with clear goals and
										live rosters.
									</p>
								</div>
								<div className="party-board-metrics">
									<div className="party-metric">
										<span>Open parties</span>
										<strong>
											{isAuthenticated ? partyList.length : "--"}
										</strong>
									</div>
									<div className="party-metric">
										<span>Accepted</span>
										<strong>
											{isAuthenticated
												? numberFormatter.format(totalAccepted)
												: "--"}
										</strong>
									</div>
									<div className="party-metric">
										<span>Requests</span>
										<strong>
											{isAuthenticated
												? numberFormatter.format(totalPending)
												: "--"}
										</strong>
									</div>
								</div>
							</div>

							<div className="party-board-body">
								{isLoading ? (
									<div className="party-loading">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span>Loading parties...</span>
									</div>
								) : !isAuthenticated ? (
									<div className="party-empty">
										<p>Sign in to browse the live party board.</p>
										<p className="text-muted-foreground">
											Once authenticated you can view parties and request to
											join instantly.
										</p>
									</div>
								) : parties === undefined ? (
									<div className="party-loading">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span>Fetching open parties...</span>
									</div>
								) : partyList.length === 0 ? (
									<div className="party-empty">
										<p>No open parties yet.</p>
										<p className="text-muted-foreground">
											Create the first listing to get the roster started.
										</p>
									</div>
								) : (
									<div className="party-list">
										{partyList.map((party) => {
											const acceptedCount = party.members.filter(
												(member) => member.status === "accepted",
											).length + 1;
											const pendingCount = party.members.filter(
												(member) => member.status === "pending",
											).length;
											const createdAt = party.createdAt ?? party._creationTime;
											const updatedAt = party.updatedAt ?? createdAt;
											const openSlots = Math.max(
												0,
												party.partySizeLimit - acceptedCount,
											);
											const ownerLabel = formatOwnerLabel(party.ownerId);

											return (
												<div key={party._id} className="party-list-card">
													<div className="party-list-header">
														<div>
															<div className="party-list-title">
																<Crown className="h-4 w-4" />
																<span>{party.name}</span>
															</div>
															<p className="party-list-owner">
																Leader: {ownerLabel}
															</p>
														</div>
														<span className="party-status">
															<Users className="h-3.5 w-3.5" />
															Open
														</span>
													</div>
													<p className="party-list-desc">
														{party.description?.trim()
															? party.description
															: "No description yet. Add a quick summary so recruits know the vibe."}
													</p>
													<div className="party-list-meta">
														<span>
															Slots open:{" "}
															{numberFormatter.format(openSlots)}
														</span>
														<span>
															Accepted:{" "}
															{numberFormatter.format(acceptedCount)}
														</span>
														<span>
															Requests:{" "}
															{numberFormatter.format(pendingCount)}
														</span>
													</div>
													<div className="party-list-footer">
														<span>
															Limit:{" "}
															{numberFormatter.format(party.partySizeLimit)}{" "}
															players
														</span>
														<span>
															Updated {dateFormatter.format(new Date(updatedAt))}
														</span>
													</div>
													<div className="party-list-actions">
														<Link
															to="/party/$partyId"
															params={{ partyId: party._id }}
															className={cn(
																buttonVariants({
																	variant: "secondary",
																	size: "sm",
																}),
																"party-view-button",
															)}
														>
															View party
														</Link>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
