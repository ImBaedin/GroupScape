import { api } from "@GroupScape/backend/convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import CreatePartyForm from "@/components/create-party-form";
import HeadshotSelector from "@/components/headshot-selector";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
	const [model, setModel] = useState<string>("");

	const healthCheck = useQuery(api.healthCheck.get);

	const getModel = useAction(api.player.getModelFromRuneProfile);
	useEffect(() => {
		getModel({ username: "IronBaedin" }).then((data) => {
			setModel(JSON.stringify(data, null, 4));
		});
	}, []);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<CreatePartyForm />

			<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck === "OK" ? "bg-green-500" : healthCheck === undefined ? "bg-orange-400" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck === undefined
								? "Checking..."
								: healthCheck === "OK"
									? "Connected"
									: "Error"}
						</span>
					</div>
				</section>
				<HeadshotSelector
					username="GIM Wamuu"
					onComplete={(imageData) => {
						console.log(imageData);
					}}
				/>
				<HeadshotSelector
					username="Mud Akudama"
					onComplete={(imageData) => {
						console.log(imageData);
					}}
				/>

				<CreatePartyForm />
			</div>
		</div>
	);
}
