import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { PartyDetailPage } from "@/features/party-detail/components/PartyDetailPage";

export const Route = createFileRoute("/party/$partyId")({
	component: PartyDetailRoute,
});

function PartyDetailRoute() {
	const { partyId } = Route.useParams();
	return <PartyDetailPage partyId={partyId as Id<"parties">} />;
}
