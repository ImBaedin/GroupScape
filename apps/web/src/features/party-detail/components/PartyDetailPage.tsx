import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PartyDetailProvider } from "../context";
import { usePartyDerivedState } from "../hooks/usePartyDerivedState";
import { usePartyDetailQueries } from "../hooks/usePartyDetailQueries";
import { usePartyFormatting } from "../hooks/usePartyFormatting";
import { PartyDetailHeader } from "./PartyDetailHeader";
import { PartyDetailMainColumn } from "./PartyDetailMainColumn";
import { PartyDetailSideColumn } from "./PartyDetailSideColumn";

export function PartyDetailPage({ partyId }: { partyId: Id<"parties"> }) {
	const queryState = usePartyDetailQueries(partyId);
	const {
		isLoading,
		isAuthenticated,
		partyData,
		party,
		appUser,
		partyLock,
		accountList,
		accountMap,
		memberProfilesByAccountId,
		areMemberProfilesLoading,
	} = queryState;

	if (isLoading) {
		return (
			<div className="party-detail flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-16">
				<div className="party-loading">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading party...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="party-detail min-h-[calc(100svh-4rem)] px-4 py-16 sm:px-8">
				<div className="party-detail-shell mx-auto max-w-5xl">
					<Card className="party-guest">
						<CardHeader>
							<CardTitle>Sign in to view parties</CardTitle>
							<CardDescription>
								Authenticate to see the roster and request an invite.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-3">
							<Link to="/auth" className={cn(buttonVariants(), "party-primary")}>
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
				</div>
			</div>
		);
	}

	if (partyData === undefined) {
		return (
			<div className="party-detail flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-16">
				<div className="party-loading">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Fetching party details...</span>
				</div>
			</div>
		);
	}

	if (partyData === null || !party) {
		return (
			<div className="party-detail min-h-[calc(100svh-4rem)] px-4 py-16 sm:px-8">
				<div className="party-detail-shell mx-auto max-w-5xl">
					<Card className="party-empty">
						<CardHeader>
							<CardTitle>Party not found</CardTitle>
							<CardDescription>
								This party may have been closed or removed.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-3">
							<Link
								to="/parties"
								search={{ search: "" }}
								className={cn(
									buttonVariants({ variant: "secondary" }),
									"party-secondary",
								)}
							>
								Back to parties
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<PartyDetailLoadedContent
			party={party}
			appUser={appUser}
			partyLock={partyLock}
			accountList={accountList}
			accountMap={accountMap}
			memberProfilesByAccountId={memberProfilesByAccountId}
			areMemberProfilesLoading={areMemberProfilesLoading}
			isAuthenticated={isAuthenticated}
		/>
	);
}

function PartyDetailLoadedContent({
	party,
	appUser,
	partyLock,
	accountList,
	accountMap,
	memberProfilesByAccountId,
	areMemberProfilesLoading,
	isAuthenticated,
}: {
	party: NonNullable<ReturnType<typeof usePartyDetailQueries>["party"]>;
	appUser: ReturnType<typeof usePartyDetailQueries>["appUser"];
	partyLock: ReturnType<typeof usePartyDetailQueries>["partyLock"];
	accountList: ReturnType<typeof usePartyDetailQueries>["accountList"];
	accountMap: ReturnType<typeof usePartyDetailQueries>["accountMap"];
	memberProfilesByAccountId: ReturnType<
		typeof usePartyDetailQueries
	>["memberProfilesByAccountId"];
	areMemberProfilesLoading: ReturnType<
		typeof usePartyDetailQueries
	>["areMemberProfilesLoading"];
	isAuthenticated: boolean;
}) {
	const derived = usePartyDerivedState({
		party,
		appUser,
		memberProfilesByAccountId,
		areMemberProfilesLoading,
	});
	const formatting = usePartyFormatting({
		accountMap,
		appUserId: appUser?._id,
		partyOwnerId: party.ownerId,
	});

	return (
		<PartyDetailProvider
			value={{
				party,
				appUser,
				partyLock,
				accountList,
				derived,
				formatting,
				isAuthenticated,
			}}
		>
			<div className="party-detail min-h-[calc(100svh-4rem)] px-4 pt-10 pb-20 sm:px-8">
				<div className="party-detail-shell mx-auto max-w-6xl">
					<PartyDetailHeader />
					<section className="party-detail-grid">
						<PartyDetailMainColumn />
						<PartyDetailSideColumn />
					</section>
				</div>
			</div>
		</PartyDetailProvider>
	);
}
