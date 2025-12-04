#!/usr/bin/env bun

/**
 * Test script for RuneLite Party Client
 *
 * This script connects to a party with the passphrase "groupscapetest"
 * and logs all received data.
 *
 * Run with: bun run test.ts
 */

import { parsePartyBatchedChange, RuneLitePartyClient } from "./src/index";

const PASSPHRASE = "groupscapetest";

console.log("Starting RuneLite Party Client test...");
console.log(`Passphrase: "${PASSPHRASE}"`);

// Session ID will be auto-generated if not provided
const client = new RuneLitePartyClient();

// Track if connection closes immediately
let connectionClosed = false;
let closeEvent: { code: number; reason: string; wasClean: boolean } | null =
	null;

// Set up event handlers
client.setCallbacks({
	onConnect: () => {
		console.log("✓ Connected to RuneLite party server");
	},
	onDisconnect: (event) => {
		connectionClosed = true;
		closeEvent = event || null;
		console.log("\n✗ Disconnected from server");
		if (event) {
			console.log(`  Close code: ${event.code}`);
			console.log(`  Reason: ${event.reason || "none"}`);
			console.log(`  Was clean: ${event.wasClean}`);
			if (event.code === 1006) {
				console.log(
					"  Note: Code 1006 usually means connection was closed abnormally",
				);
			}
		}
	},
	onError: (error) => {
		console.error("✗ Error:", error.message);
	},
	onUserJoin: (data) => {
		console.log("\n[User Join]");
		console.log(`  Party ID: ${data.partyId}`);
		console.log(`  Member ID: ${data.memberId}`);
	},
	onUserPart: (data) => {
		console.log("\n[User Part]");
		console.log(`  Party ID: ${data.partyId}`);
		console.log(`  Member ID: ${data.memberId}`);
	},
	onPartyData: (data) => {
		console.log("\n[Party Data Received]");
		console.log(`  Party ID: ${data.partyId}`);
		console.log(`  From Member ID: ${data.memberId}`);
		console.log(`  Type: ${data.type}`);
		console.log(`  Data length: ${data.data.length} bytes`);

		if (data.type === "PartyBatchedChange") {
			const text = new TextDecoder().decode(data.data);
			const obj = JSON.parse(text);

			const parsed = parsePartyBatchedChange(obj);

			console.log(parsed);

			// console.log(
			// 	JSON.stringify(
			// 		parsed,
			// 		(_, v) => (typeof v === "bigint" ? v.toString() : v),
			// 		2,
			// 	),
			// );
		}

		// Try to decode as text if it's a string
		// try {
		// 	const text = new TextDecoder().decode(data.data);
		// 	console.log(`  Data (as text): ${text}`);
		// } catch {
		// 	console.log(
		// 		`  Data (hex): ${Array.from(data.data)
		// 			.map((b) => b.toString(16).padStart(2, "0"))
		// 			.join(" ")}`,
		// 	);
		// }
	},
});

// Handle process termination
process.on("SIGINT", () => {
	console.log("\n\nShutting down...");
	client.disconnect();
	process.exit(0);
});

// Connect and join
try {
	console.log("Connecting to server...");
	console.log("WebSocket URL: wss://api.runelite.net/ws2");
	console.log(
		"Note: Session ID will be auto-generated and included in the connection URL",
	);

	await client.connect();

	// Join immediately - don't wait
	console.log("Calculating party ID from passphrase...");
	const { partyId, memberId } = await client.joinWithPassphrase(PASSPHRASE);
	console.log("\n✓ Joined party successfully!");
	console.log(`  Party ID: ${partyId}`);
	console.log(`  Member ID: ${memberId}`);
	console.log("\nListening for party events... (Press Ctrl+C to exit)\n");

	// Keep the process alive
	setInterval(() => {
		if (!client.isConnected()) {
			console.log("\nConnection lost. Exiting...");
			process.exit(1);
		}
	}, 1000);
} catch (error) {
	console.error("\nFailed to connect or join party:", error);
	if (error instanceof Error) {
		console.error("Error details:", error.message);
		console.error("Stack:", error.stack);
	}
	client.disconnect();
	process.exit(1);
}
