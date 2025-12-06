/**
 * WebSocket client for RuneLite Party system.
 * Handles connection management and message encoding/decoding.
 */

import {
	buildDataMessage,
	buildJoinMessage,
	buildPartMessage,
	encodeC2SMessage,
	readS2CMessage,
} from "./party-messages.js";
import type { PartyData, S2C, UserJoin, UserPart } from "./types.js";
import {
	generateMemberId,
	generateSessionId,
	passphraseToId,
} from "./utils.js";

export const DEFAULT_WEBSOCKET_URL = "https://api.runelite.net/ws2";

/**
 * Convert HTTP/HTTPS URL to WebSocket URL and append session ID if provided
 */
function toWebSocketUrl(url: string, sessionId?: string): string {
	let wsUrl: string;

	if (url.startsWith("http://")) {
		wsUrl = url.replace("http://", "ws://");
	} else if (url.startsWith("https://")) {
		wsUrl = url.replace("https://", "wss://");
	} else if (url.startsWith("ws://") || url.startsWith("wss://")) {
		wsUrl = url;
	} else {
		// Default to wss if no protocol specified
		wsUrl = `wss://${url}`;
	}

	// Append session ID as query parameter if provided
	if (sessionId) {
		const separator = wsUrl.includes("?") ? "&" : "?";
		wsUrl = `${wsUrl}${separator}sessionId=${encodeURIComponent(sessionId)}`;
	}

	return wsUrl;
}

/**
 * Connection state of the client
 */
export enum ConnectionState {
	DISCONNECTED = "disconnected",
	CONNECTING = "connecting",
	CONNECTED = "connected",
	DISCONNECTING = "disconnecting",
	ERROR = "error",
}

/**
 * Event callbacks for party events
 */
export interface PartyEventCallbacks {
	onUserJoin?: (data: UserJoin) => void;
	onUserPart?: (data: UserPart) => void;
	onPartyData?: (data: PartyData) => void;
	onConnect?: () => void;
	onDisconnect?: (event?: {
		code: number;
		reason: string;
		wasClean: boolean;
	}) => void;
	onError?: (error: Error) => void;
}

/**
 * RuneLite Party WebSocket Client
 */
export class RuneLitePartyClient {
	private ws: WebSocket | null = null;
	private wsUrl: string;
	private state: ConnectionState = ConnectionState.DISCONNECTED;
	private callbacks: PartyEventCallbacks = {};
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // 1 second
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private currentPartyId: bigint | null = null;
	private currentMemberId: bigint | null = null;
	private sessionId: string;

	/**
	 * Create a new RuneLite Party client
	 * @param wsUrl - WebSocket URL (default: https://api.runelite.net/ws2)
	 * @param sessionId - Optional session ID. If not provided, one will be auto-generated.
	 */
	constructor(wsUrl: string = DEFAULT_WEBSOCKET_URL, sessionId?: string) {
		this.sessionId = sessionId ?? generateSessionId();
		this.wsUrl = toWebSocketUrl(wsUrl, this.sessionId);
	}

	/**
	 * Get the current connection state
	 */
	getState(): ConnectionState {
		return this.state;
	}

	/**
	 * Check if the client is connected
	 */
	isConnected(): boolean {
		return (
			this.state === ConnectionState.CONNECTED &&
			this.ws?.readyState === WebSocket.OPEN
		);
	}

	/**
	 * Set event callbacks
	 */
	setCallbacks(callbacks: PartyEventCallbacks): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
	}

	/**
	 * Connect to the WebSocket server
	 */
	async connect(): Promise<void> {
		if (
			this.state === ConnectionState.CONNECTED ||
			this.state === ConnectionState.CONNECTING
		) {
			return;
		}

		this.setState(ConnectionState.CONNECTING);

		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.wsUrl);

				this.ws.binaryType = "arraybuffer";

				this.ws.onopen = () => {
					this.setState(ConnectionState.CONNECTED);
					this.reconnectAttempts = 0;
					this.callbacks.onConnect?.();
					resolve();
				};

				this.ws.onmessage = async (event) => {
					if (event.data instanceof ArrayBuffer) {
						await this.handleMessage(new Uint8Array(event.data));
					} else {
						console.warn("Received non-binary message, ignoring");
					}
				};

				this.ws.onerror = (_error) => {
					this.setState(ConnectionState.ERROR);
					const errorObj = new Error("WebSocket error occurred");
					this.callbacks.onError?.(errorObj);
					// Only reject if we're not already connected (connection failed)
					if (this.state === ConnectionState.CONNECTING) {
						reject(errorObj);
					}
				};

				this.ws.onclose = (event) => {
					const wasConnected = this.state === ConnectionState.CONNECTED;
					const wasConnecting = this.state === ConnectionState.CONNECTING;
					this.setState(ConnectionState.DISCONNECTED);
					this.ws = null;

					this.callbacks.onDisconnect?.({
						code: event.code,
						reason: event.reason || "",
						wasClean: event.wasClean,
					});

					// If connection closed while connecting, report it as an error
					if (wasConnecting) {
						const errorMsg = `Connection closed during connection attempt. Code: ${event.code}, Reason: ${event.reason || "none"}`;
						this.callbacks.onError?.(new Error(errorMsg));
					}

					// Only attempt reconnect if we were previously connected
					// and the close wasn't intentional (code 1000 = normal closure)
					if (wasConnected && event.code !== 1000) {
						this.attemptReconnect();
					}
				};
			} catch (error) {
				this.setState(ConnectionState.ERROR);
				const err =
					error instanceof Error
						? error
						: new Error("Failed to create WebSocket");
				this.callbacks.onError?.(err);
				reject(err);
			}
		});
	}

	/**
	 * Disconnect from the WebSocket server
	 */
	disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.setState(ConnectionState.DISCONNECTING);
			this.ws.close();
			this.ws = null;
		}

		this.setState(ConnectionState.DISCONNECTED);
		this.currentPartyId = null;
		this.currentMemberId = null;
		this.reconnectAttempts = 0;
	}

	/**
	 * Join a party with a party ID and member ID
	 */
	async join(partyId: bigint, memberId: bigint): Promise<void> {
		if (!this.isConnected()) {
			throw new Error("Not connected to server. Call connect() first.");
		}

		this.currentPartyId = partyId;
		this.currentMemberId = memberId;

		const c2s = buildJoinMessage(partyId, memberId);
		await this.sendC2S(c2s);
	}

	/**
	 * Join a party using a passphrase.
	 * The passphrase is converted to a party ID, and a member ID is automatically generated if not already set.
	 *
	 * @param passphrase - The party passphrase string
	 * @param memberId - Optional member ID. If not provided and no member ID exists in the client, one will be generated.
	 */
	async joinWithPassphrase(
		passphrase: string,
		memberId?: bigint,
	): Promise<{ partyId: bigint; memberId: bigint }> {
		if (!this.isConnected()) {
			throw new Error("Not connected to server. Call connect() first.");
		}

		// Convert passphrase to party ID
		const partyId = await passphraseToId(passphrase);

		// Use provided memberId, existing memberId, or generate a new one
		const finalMemberId =
			memberId ?? this.currentMemberId ?? generateMemberId();

		// Store memberId in client instance
		this.currentMemberId = finalMemberId;

		await this.join(partyId, finalMemberId);

		return { partyId, memberId: finalMemberId };
	}

	/**
	 * Leave the current party
	 */
	async leave(): Promise<void> {
		if (!this.isConnected()) {
			return;
		}

		const c2s = buildPartMessage();
		await this.sendC2S(c2s);

		this.currentPartyId = null;
		this.currentMemberId = null;
	}

	/**
	 * Send data to the party
	 */
	async sendData(type: string, data: Uint8Array): Promise<void> {
		if (!this.isConnected()) {
			throw new Error("Not connected to server. Call connect() first.");
		}

		const c2s = buildDataMessage(type, data);
		await this.sendC2S(c2s);
	}

	/**
	 * Send a UserSync message to request all clients to send their updates
	 *
	 * TODO: FIX THIS
	 * This likely isn't working, as we don't get updates after sending this message.
	 */
	async sendUserSync(): Promise<void> {
		if (!this.isConnected()) {
			throw new Error("Not connected to server. Call connect() first.");
		}

		// UserSync is sent as a Data message with type "UserSync" and empty data
		const c2s = buildDataMessage("UserSync", new Uint8Array(0));
		await this.sendC2S(c2s);
	}

	/**
	 * Send a C2S message
	 */
	private async sendC2S(
		message: Parameters<typeof encodeC2SMessage>[0],
	): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket is not open");
		}

		try {
			const encoded = await encodeC2SMessage(message);
			this.ws.send(encoded);
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error("Failed to encode message");
			this.callbacks.onError?.(err);
			throw err;
		}
	}

	/**
	 * Handle incoming message
	 */
	private async handleMessage(data: Uint8Array): Promise<void> {
		try {
			const s2c: S2C = await readS2CMessage(data);

			switch (s2c.msgCase) {
				case "join":
					// Check if this is our own join event (successful connection to party)
					if (
						this.currentMemberId !== null &&
						s2c.join.memberId === this.currentMemberId
					) {
						// Send UserSync to request all clients to send their updates
						this.sendUserSync().catch((error) => {
							this.callbacks.onError?.(
								error instanceof Error
									? error
									: new Error("Failed to send UserSync"),
							);
						});
					}
					this.callbacks.onUserJoin?.(s2c.join);
					break;
				case "part":
					this.callbacks.onUserPart?.(s2c.part);
					break;
				case "data":
					this.callbacks.onPartyData?.(s2c.data);
					break;
				case "MSG_NOT_SET":
					console.warn("Received S2C message with no case set");
					break;
			}
		} catch (error) {
			const err =
				error instanceof Error ? error : new Error("Failed to decode message");
			this.callbacks.onError?.(err);
		}
	}

	/**
	 * Attempt to reconnect to the server
	 */
	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			const error = new Error(
				`Max reconnect attempts (${this.maxReconnectAttempts}) reached`,
			);
			this.callbacks.onError?.(error);
			return;
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1); // Exponential backoff

		this.reconnectTimer = setTimeout(() => {
			this.connect().catch((error) => {
				this.callbacks.onError?.(error);
			});
		}, delay);
	}

	/**
	 * Set connection state
	 */
	private setState(newState: ConnectionState): void {
		this.state = newState;
	}

	/**
	 * Get current party ID (if joined)
	 */
	getCurrentPartyId(): bigint | null {
		return this.currentPartyId;
	}

	/**
	 * Get current member ID (if joined)
	 */
	getCurrentMemberId(): bigint | null {
		return this.currentMemberId;
	}
}
