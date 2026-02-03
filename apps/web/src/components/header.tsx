import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const links = [{ to: "/", label: "Home" }] as const;

	return (
		<div className="p-4">
			<div className="flex flex-row items-center justify-between bg-[url(/ui/background.png)] p-2 [border-image:url(/ui/border.png)_9_9/9px_stretch] dark:bg-[url(/ui/background-dark.png)] dark:[border-image:url(/ui/border-dark.png)_9_9/9px_stretch]">
				<div className="flex items-center gap-2">
					<img src="/logo.png" alt="GroupScape" className="h-16" />
				</div>
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="mr-4 flex items-center gap-2">
					<ModeToggle />
				</div>
			</div>
		</div>
	);
}
