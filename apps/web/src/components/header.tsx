import { Link } from "@tanstack/react-router";
import ProfileBadge from "@/components/profile-badge";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/parties", label: "Parties" },
		{ to: "/party-tracker", label: "Party Tracker" },
	] as const;

	return (
		<header className="app-header">
			<div className="app-header-inner">
				<Link to="/" className="app-brand">
					<img
						src="/logo.png"
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
					<ProfileBadge />
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
