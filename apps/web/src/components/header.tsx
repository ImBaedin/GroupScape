import { api } from "@GroupScape/backend/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Users } from "lucide-react";
import ProfileBadge from "@/components/profile-badge";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const links = [
		{ to: "/parties", label: "Parties" },
		{ to: "/party-tracker", label: "Party Tracker" },
	] as const;
	const { isAuthenticated } = useConvexAuth();
	const activeParty = useQuery(
		api.parties.getActiveForUser,
		isAuthenticated ? {} : "skip",
	);

	return (
		<header className="app-header">
			<div className="app-header-inner">
				<Link to="/" className="app-brand">
					<img
						src="/square-logo.jpg"
						alt="GroupScape"
						className="h-10 w-10 rounded-full border border-border/60"
					/>
					<div>
						<p className="app-brand-title">GroupScape</p>
						<p className="app-brand-sub">Party Sync Network</p>
					</div>
				</Link>
				<nav className="app-nav">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to} className="app-nav-link">
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="app-actions">
					{activeParty ? (
						<Link
							to="/party/$partyId"
							params={{ partyId: activeParty._id }}
							className="app-active-party"
						>
							<Users className="h-4 w-4" />
							<span className="app-active-party-label">Active</span>
							<span className="app-active-party-name">
								{activeParty.name}
							</span>
						</Link>
					) : null}
					<ProfileBadge />
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
