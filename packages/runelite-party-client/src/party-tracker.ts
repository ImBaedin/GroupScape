/**
 * Party Tracker
 *
 * Wraps RuneLitePartyClient and maintains internal state for party members.
 * Tracks member updates from PartyBatchedChange events and removes members on Part events.
 */

import { DEFAULT_WEBSOCKET_URL, RuneLitePartyClient } from "./client.js";
import { processPartyData } from "./party-data-pipeline.js";
import type { PartyData, UserPart } from "./types.js";

/**
 * Skill information for a party member
 */
export interface MemberSkill {
	index: number;
	name: string;
	level: number;
	base: number;
}

/**
 * Misc data for a party member
 */
export interface MemberMisc {
	rawMap: Record<string, unknown>;
	interpreted: {
		username: string | null;
		world: number | null;
		combatLevel: number | null;
		totalLevel: number | null;
		specialState: number | null;
		prayerActive: number | null;
		deityOrDead: number | null;
		runEnergyOrRatio: number | null;
		S: number | null;
	};
}

/**
 * Status update information for a party member
 */
export interface MemberStatus {
	type?: string;
	name?: string;
	health?: {
		current: number;
		max: number;
	};
	prayer?: {
		current: number;
		max: number;
	};
	runEnergy?: number;
	specEnergy?: number;
	vengeanceActive?: boolean;
	memberColor?: {
		r: number;
		g: number;
		b: number;
		a: number;
	};
}

/**
 * Location update information for a party member
 */
export interface MemberLocation {
	type?: string;
	coordinate?: {
		encoded: number;
		x: number;
		y: number;
		plane: number;
	};
}

/**
 * Batched update information for a party member
 */
export interface MemberBatchedUpdate {
	type?: string;
	inventory?: Array<{ id: number; qty: number }>;
	equipment?: Array<{ id: number; qty: number }>;
	skills?: MemberSkill[];
	misc?: MemberMisc;
	availablePrayers?: unknown; // bit-packed, contains all available prayers on every change
	enabledPrayers?: unknown; // bit-packed, contains all enabled prayers on every change
	unlockedPrayers?: unknown; // bit-packed, contains all unlocked prayers on every change. Only for deadeye/vigour currently
	runePouch?: Array<{ id: number; qty: number }>; // itemId and quantity
	quiver?: Array<{ id: number; qty: number }>; // itemId and quantity
}

/**
 * State of a party member
 * Stores status, location, and batched updates separately
 */
export interface MemberState {
	status?: MemberStatus;
	location?: MemberLocation;
	batchedUpdate?: MemberBatchedUpdate;
}

/**
 * Callbacks for party tracker events
 */
export interface PartyTrackerCallbacks {
	onMemberUpdate?: (memberId: bigint, state: MemberState) => void;
	onMemberRemoved?: (memberId: bigint) => void;
	onConnect?: () => void;
	onDisconnect?: (event?: {
		code: number;
		reason: string;
		wasClean: boolean;
	}) => void;
	onError?: (error: Error) => void;
}

/**
 * Party Tracker
 *
 * Wraps RuneLitePartyClient and maintains internal state for party members.
 */
export class PartyTracker {
	private client: RuneLitePartyClient;
	private members: Map<bigint, MemberState> = new Map();
	private callbacks: PartyTrackerCallbacks = {};

	/**
	 * Create a new Party Tracker
	 * @param wsUrl - WebSocket URL (default: https://api.runelite.net/ws2)
	 * @param sessionId - Optional session ID. If not provided, one will be auto-generated.
	 */
	constructor(wsUrl: string = DEFAULT_WEBSOCKET_URL, sessionId?: string) {
		this.client = new RuneLitePartyClient(wsUrl, sessionId);
		this.setupClientCallbacks();
	}

	/**
	 * Set up internal callbacks for the underlying client
	 */
	private setupClientCallbacks(): void {
		this.client.setCallbacks({
			onConnect: () => {
				this.callbacks.onConnect?.();
			},
			onDisconnect: (event) => {
				this.callbacks.onDisconnect?.(event);
			},
			onError: (error) => {
				this.callbacks.onError?.(error);
			},
			onUserPart: (data: UserPart) => {
				this.handleUserPart(data);
			},
			onPartyData: (data: PartyData) => {
				this.handlePartyData(data);
			},
		});
	}

	/**
	 * Handle UserPart event - remove member from tracking
	 */
	private handleUserPart(data: UserPart): void {
		const { memberId } = data;
		if (this.members.has(memberId)) {
			this.members.delete(memberId);
			this.callbacks.onMemberRemoved?.(memberId);
		}
	}

	/**
	 * Handle PartyData event - process through pipeline and update member state
	 */
	private handlePartyData(data: PartyData): void {
		try {
			// Decode the JSON data from Uint8Array
			const text = new TextDecoder().decode(data.data);
			const jsonData = JSON.parse(text);

			// Process through the pipeline
			const result = processPartyData(data.type, jsonData);

			if (result.success === false) {
				this.callbacks.onError?.(result.error);
				return;
			}

			const memberId = data.memberId;
			const existingState = this.members.get(memberId) || {};

			// Handle different update types separately
			const updatedState: MemberState = { ...existingState };

			if (data.type === "StatusUpdate") {
				const parsed = result.data as MemberStatus;
				// Merge only fields that are present in the original JSON
				const existingHealth = existingState.status?.health;
				const existingPrayer = existingState.status?.prayer;

				// Build health object only if we have valid values
				const healthUpdate: { current: number; max: number } | undefined =
					jsonData.hc !== undefined || jsonData.hm !== undefined
						? {
								current:
									jsonData.hc !== undefined &&
									parsed.health?.current !== undefined
										? parsed.health.current
										: (existingHealth?.current ?? 0),
								max:
									jsonData.hm !== undefined && parsed.health?.max !== undefined
										? parsed.health.max
										: (existingHealth?.max ?? 0),
							}
						: existingHealth;

				// Build prayer object only if we have valid values
				const prayerUpdate: { current: number; max: number } | undefined =
					jsonData.pc !== undefined || jsonData.pm !== undefined
						? {
								current:
									jsonData.pc !== undefined &&
									parsed.prayer?.current !== undefined
										? parsed.prayer.current
										: (existingPrayer?.current ?? 0),
								max:
									jsonData.pm !== undefined && parsed.prayer?.max !== undefined
										? parsed.prayer.max
										: (existingPrayer?.max ?? 0),
							}
						: existingPrayer;

				updatedState.status = {
					...(existingState.status || {}),
					...(jsonData.type !== undefined && { type: parsed.type }),
					...(jsonData.n !== undefined && { name: parsed.name }),
					...(healthUpdate !== undefined && { health: healthUpdate }),
					...(prayerUpdate !== undefined && { prayer: prayerUpdate }),
					...(jsonData.r !== undefined && { runEnergy: parsed.runEnergy }),
					...(jsonData.s !== undefined && { specEnergy: parsed.specEnergy }),
					...(jsonData.v !== undefined && {
						vengeanceActive: parsed.vengeanceActive,
					}),
					...(jsonData.c !== undefined && { memberColor: parsed.memberColor }),
				};
			} else if (data.type === "LocationUpdate") {
				const parsed = result.data as MemberLocation;
				// Merge only fields that are present in the original JSON
				updatedState.location = {
					...(existingState.location || {}),
					...(jsonData.type !== undefined && { type: parsed.type }),
					...(jsonData.c !== undefined && { coordinate: parsed.coordinate }),
				};
			} else if (data.type === "PartyBatchedChange") {
				const parsed = result.data as MemberBatchedUpdate;
				// Merge only fields that are present in the original JSON
				updatedState.batchedUpdate = {
					...(existingState.batchedUpdate || {}),
					...(jsonData.type !== undefined && { type: parsed.type }),
					...(jsonData.i !== undefined && { inventory: parsed.inventory }),
					...(jsonData.e !== undefined && { equipment: parsed.equipment }),
					...(jsonData.s !== undefined && { skills: parsed.skills }),
					...(jsonData.m !== undefined && { misc: parsed.misc }),
					...(jsonData.ap !== undefined && {
						availablePrayers: parsed.availablePrayers,
					}),
					...(jsonData.ep !== undefined && {
						enabledPrayers: parsed.enabledPrayers,
					}),
					...(jsonData.up !== undefined && {
						unlockedPrayers: parsed.unlockedPrayers,
					}),
					...(jsonData.rp !== undefined && { runePouch: parsed.runePouch }),
					...(jsonData.q !== undefined && { quiver: parsed.quiver }),
				};
			}

			// Update the member state
			this.members.set(memberId, updatedState);

			// Trigger callback
			this.callbacks.onMemberUpdate?.(memberId, updatedState);
		} catch (error) {
			const err =
				error instanceof Error
					? error
					: new Error("Failed to process PartyData");
			this.callbacks.onError?.(err);
		}
	}

	/**
	 * Connect to the WebSocket server
	 */
	async connect(): Promise<void> {
		await this.client.connect();
	}

	/**
	 * Disconnect from the WebSocket server
	 */
	disconnect(): void {
		this.client.disconnect();
		// Clear members on disconnect
		this.members.clear();
	}

	/**
	 * Join a party using a passphrase
	 * @param passphrase - The party passphrase string
	 * @returns Party ID and member ID
	 */
	async joinParty(
		passphrase: string,
	): Promise<{ partyId: bigint; memberId: bigint }> {
		return await this.client.joinWithPassphrase(passphrase);
	}

	/**
	 * Leave the current party
	 */
	async leaveParty(): Promise<void> {
		await this.client.leave();
		// Clear members on leave
		this.members.clear();
	}

	/**
	 * Send a UserSync message to request all clients to send their updates
	 */
	async sendUserSync(): Promise<void> {
		await this.client.sendUserSync();
	}

	/**
	 * Get all tracked party members
	 * @returns Map of memberId to MemberState
	 */
	getMembers(): Map<bigint, MemberState> {
		return new Map(this.members);
	}

	/**
	 * Get a specific member's state
	 * @param memberId - The member ID to look up
	 * @returns The member's state, or undefined if not found
	 */
	getMember(memberId: bigint): MemberState | undefined {
		return this.members.get(memberId);
	}

	/**
	 * Set event callbacks
	 * @param callbacks - Callbacks for party tracker events
	 */
	setCallbacks(callbacks: PartyTrackerCallbacks): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
	}

	/**
	 * Check if the tracker is connected
	 */
	isConnected(): boolean {
		return this.client.isConnected();
	}
}
