import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MemberState } from "@GroupScape/runelite-party-client";

export const Route = createFileRoute("/party-tracker")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw redirect({ to: "/parties", search: { search: "" } });
		}
	},
	component: PartyTrackerTest,
});

interface MemberDisplay {
	id: string;
	state: MemberState;
}

type PartyTrackerClient = {
	setCallbacks: (callbacks: {
		onConnect: () => void;
		onDisconnect: (event?: { wasClean?: boolean; code?: number }) => void;
		onError: (error: Error) => void;
		onMemberUpdate: (memberId: bigint, state: MemberState) => void;
		onMemberRemoved: (memberId: bigint) => void;
	}) => void;
	connect: () => Promise<unknown>;
	disconnect: () => void;
	joinParty: (passphrase: string) => Promise<unknown>;
	leaveParty: () => Promise<unknown>;
	sendUserSync: () => Promise<unknown>;
};

function PartyTrackerTest() {
	const trackerRef = useRef<PartyTrackerClient | null>(null);
	const [members, setMembers] = useState<Map<string, MemberDisplay>>(new Map());
	const [isConnected, setIsConnected] = useState(false);
	const [passphrase, setPassphrase] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [connectionStatus, setConnectionStatus] =
		useState<string>("Disconnected");

	useEffect(() => {
		let mounted = true;
		let tracker: PartyTrackerClient | null = null;
		setConnectionStatus("Connecting...");

		void import("@GroupScape/runelite-party-client")
			.then(({ PartyTracker }) => {
				if (!mounted) {
					return;
				}

				const trackerInstance: PartyTrackerClient = new PartyTracker();
				tracker = trackerInstance;
				trackerRef.current = trackerInstance;

				trackerInstance.setCallbacks({
					onConnect: () => {
						setIsConnected(true);
						setConnectionStatus("Connected");
						setError(null);
					},
					onDisconnect: (event) => {
						setIsConnected(false);
						setConnectionStatus(
							event?.wasClean
								? "Disconnected"
								: `Disconnected (code: ${event?.code})`,
						);
						setMembers(new Map());
					},
					onError: (err) => {
						setError(err.message);
						setConnectionStatus("Error");
					},
					onMemberUpdate: (memberId, state) => {
						setMembers((prev) => {
							const newMap = new Map(prev);
							newMap.set(memberId.toString(), {
								id: memberId.toString(),
								state,
							});
							return newMap;
						});
					},
					onMemberRemoved: (memberId) => {
						setMembers((prev) => {
							const newMap = new Map(prev);
							newMap.delete(memberId.toString());
							return newMap;
						});
					},
				});

				return trackerInstance.connect();
			})
			.catch((err) => {
				if (!mounted) {
					return;
				}
				setError(err instanceof Error ? err.message : "Failed to connect");
				setConnectionStatus("Error");
				setIsConnected(false);
			});

		return () => {
			mounted = false;
			tracker?.disconnect();
			trackerRef.current = null;
		};
	}, []);

	const handleJoinParty = async () => {
		if (!trackerRef.current || !passphrase.trim()) return;

		try {
			setError(null);
			await trackerRef.current.joinParty(passphrase.trim());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to join party");
		}
	};

	const handleLeaveParty = async () => {
		if (!trackerRef.current) return;

		try {
			setError(null);
			await trackerRef.current.leaveParty();
			setMembers(new Map());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to leave party");
		}
	};

	const handleSendUserSync = async () => {
		if (!trackerRef.current) return;

		try {
			setError(null);
			await trackerRef.current.sendUserSync();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send UserSync");
		}
	};

	const memberArray = Array.from(members.values());

	return (
		<div className="container mx-auto max-w-6xl space-y-6 p-6">
			<Card>
				<CardHeader>
					<CardTitle>Party Tracker Test</CardTitle>
					<CardDescription>
						Test the RuneLite party tracker functionality
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<div
							className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="font-medium text-sm">{connectionStatus}</span>
					</div>

					{error && (
						<div className="rounded-md bg-red-500/10 p-3 text-red-500 text-sm">
							{error}
						</div>
					)}

					<div className="flex gap-2">
						<Input
							value={passphrase}
							onChange={(e) => setPassphrase(e.target.value)}
							placeholder="Enter party passphrase"
							disabled={!isConnected}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleJoinParty();
								}
							}}
						/>
						<Button
							onClick={handleJoinParty}
							disabled={!isConnected || !passphrase.trim()}
						>
							Join Party
						</Button>
						<Button
							variant="outline"
							onClick={handleLeaveParty}
							disabled={!isConnected}
						>
							Leave Party
						</Button>
					</div>

					<div className="text-muted-foreground text-sm">
						{memberArray.length === 0
							? "No party members yet. Join a party to see members."
							: `${memberArray.length} party member${memberArray.length === 1 ? "" : "s"}`}
					</div>
					<Button onClick={handleSendUserSync} disabled={!isConnected}>
						Send User Sync
					</Button>
				</CardContent>
			</Card>

			{memberArray.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{memberArray.map((member) => (
						<MemberCard key={member.id} member={member} />
					))}
				</div>
			)}
		</div>
	);
}

function MemberCard({ member }: { member: MemberDisplay }) {
	const { state } = member;

	// Get data from batched update
	const batchedUpdate = state.batchedUpdate;
	const username =
		batchedUpdate?.misc?.interpreted?.username ||
		state.status?.name ||
		`Member ${member.id.slice(0, 8)}`;
	const combatLevel = batchedUpdate?.misc?.interpreted?.combatLevel;
	const world = batchedUpdate?.misc?.interpreted?.world;
	const inventory = batchedUpdate?.inventory || [];
	const equipment = batchedUpdate?.equipment || [];
	const skills = batchedUpdate?.skills || [];
	const runePouch = batchedUpdate?.runePouch || [];
	const quiver = batchedUpdate?.quiver || [];

	// Get status information
	const status = state.status;
	const health = status?.health;
	const prayer = status?.prayer;
	const runEnergy = status?.runEnergy;
	const specEnergy = status?.specEnergy;
	const vengeanceActive = status?.vengeanceActive;
	const memberColor = status?.memberColor;

	// Get location information
	const location = state.location;
	const coordinate = location?.coordinate;

	// Convert RGBA color to CSS string
	const memberColorStyle = memberColor
		? `rgba(${memberColor.r}, ${memberColor.g}, ${memberColor.b}, ${memberColor.a / 255})`
		: undefined;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					{username}
					{memberColor && (
						<div
							className="h-4 w-4 rounded-full border"
							style={{ backgroundColor: memberColorStyle }}
							title="Member color"
						/>
					)}
					{`Member ${member.id.slice(0, 8)}`}
				</CardTitle>
				<CardDescription>
					{combatLevel && `Combat: ${combatLevel}`}
					{world && ` | World: ${world}`}
					{coordinate &&
						` | Location: (${coordinate.x}, ${coordinate.y}, plane ${coordinate.plane})`}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Status Information */}
				{(health ||
					prayer ||
					runEnergy !== undefined ||
					specEnergy !== undefined) && (
					<div>
						<h4 className="mb-2 font-semibold text-sm">Status</h4>
						<div className="space-y-2 text-xs">
							{health && (
								<div>
									<div className="mb-1 flex justify-between">
										<span>Health:</span>
										<span>
											{health.current}/{health.max}
										</span>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
										<div
											className="h-full bg-red-500 transition-all"
											style={{
												width: `${(health.current / health.max) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
							{prayer && (
								<div>
									<div className="mb-1 flex justify-between">
										<span>Prayer:</span>
										<span>
											{prayer.current}/{prayer.max}
										</span>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
										<div
											className="h-full bg-blue-500 transition-all"
											style={{
												width: `${(prayer.current / prayer.max) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
							{runEnergy !== undefined && (
								<div className="flex justify-between">
									<span>Run Energy:</span>
									<span>{runEnergy}%</span>
								</div>
							)}
							{specEnergy !== undefined && (
								<div className="flex justify-between">
									<span>Special Energy:</span>
									<span>{specEnergy}%</span>
								</div>
							)}
							{vengeanceActive && (
								<div className="flex items-center gap-1 text-yellow-500">
									<span>⚡</span>
									<span>Vengeance Active</span>
								</div>
							)}
						</div>
					</div>
				)}

				{inventory.length > 0 && (
					<div>
						<h4 className="mb-2 font-semibold text-sm">Inventory</h4>
						<div className="grid grid-cols-4 gap-1">
							{inventory.map((item, idx) => (
								<InventoryItem
									key={`${item.id}-${idx}`}
									itemId={item.id}
									quantity={item.qty}
								/>
							))}
						</div>
					</div>
				)}

				{equipment.length > 0 && (
					<div>
						<h4 className="mb-2 font-semibold text-sm">Equipment</h4>
						<div className="grid grid-cols-4 gap-1">
							{equipment.map((item, idx) => (
								<InventoryItem
									key={`${item.id}-${idx}`}
									itemId={item.id}
									quantity={item.qty}
								/>
							))}
						</div>
					</div>
				)}

				{runePouch.length > 0 && (
					<div>
						<h4 className="mb-2 font-semibold text-sm">Rune Pouch</h4>
						<div className="grid grid-cols-4 gap-1">
							{runePouch.map((item, idx) => (
								<InventoryItem
									key={`rune-${item.id}-${idx}`}
									itemId={item.id}
									quantity={item.qty}
								/>
							))}
						</div>
					</div>
				)}

				{quiver.length > 0 && (
					<div>
						<h4 className="mb-2 font-semibold text-sm">Quiver</h4>
						<div className="grid grid-cols-4 gap-1">
							{quiver.map((item, idx) => (
								<InventoryItem
									key={`quiver-${item.id}-${idx}`}
									itemId={item.id}
									quantity={item.qty}
								/>
							))}
						</div>
					</div>
				)}

				{skills.length > 0 && (
					<div>
						<h4 className="mb-2 font-semibold text-sm">Skills</h4>
						<div className="space-y-1">
							{skills.slice(0, 5).map((skill) => (
								<div key={skill.index} className="flex justify-between text-xs">
									<span>{skill.name}:</span>
									<span>
										{skill.level}
										{skill.base !== skill.level && ` (${skill.base})`}
									</span>
								</div>
							))}
							{skills.length > 5 && (
								<div className="text-muted-foreground text-xs">
									+{skills.length - 5} more
								</div>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function InventoryItem({
	itemId,
	quantity,
}: {
	itemId: number;
	quantity: number;
}) {
	const imageUrl = `https://secure.runescape.com/m=itemdb_oldschool/1764794705650_obj_sprite.gif?id=${itemId}`;

	return (
		<div className="relative aspect-square rounded border bg-muted">
			<img
				src={imageUrl}
				alt={`Item ${itemId}`}
				className="h-full w-full object-contain"
				onError={(e) => {
					// Hide broken images
					e.currentTarget.style.display = "none";
				}}
			/>
			{quantity > 1 && (
				<div className="absolute right-0 bottom-0 rounded-tl bg-black/70 px-1 text-[10px] text-white">
					{quantity > 999 ? "999+" : quantity}
				</div>
			)}
		</div>
	);
}
