/**
 * Utility functions for RuneLite Party client
 */

/**
 * Convert a passphrase string to a party ID using SHA-256 hashing.
 * Matches the Java implementation used by RuneLite.
 *
 * @param passphrase - The passphrase string
 * @returns The party ID as a bigint
 */
export async function passphraseToId(passphrase: string): Promise<bigint> {
	// 1. Create the SHA-256 hash using Web Crypto API
	const encoder = new TextEncoder();
	const data = encoder.encode(passphrase);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);

	// 2. Read the first 8 bytes as a BigInt (signed 64-bit integer)
	// Guava's HashCode.asLong() uses little-endian byte order (LittleEndianByteArray.load64)
	// This means bytes[0] is the least significant byte and bytes[7] is the most significant
	const view = new DataView(hashBuffer);
	const id = view.getBigInt64(0, true); // true = little-endian

	// 3. Apply the mask: & Long.MAX_VALUE
	// In Java, Long.MAX_VALUE is 0x7fffffffffffffffn
	const LONG_MAX_VALUE = 0x7fffffffffffffffn;

	return id & LONG_MAX_VALUE;
}

/**
 * Generate a unique member ID.
 * The ID is generated using crypto-secure random values.
 *
 * @returns The member ID as a bigint
 */
export function generateMemberId(): bigint {
	// Generate a new member ID using crypto.getRandomValues
	// We use a 64-bit random value (8 bytes)
	const randomBytes = new Uint8Array(8);
	crypto.getRandomValues(randomBytes);

	// Convert to BigInt, but mask to ensure it's positive (like Long.MAX_VALUE)
	// Read as unsigned first, then mask
	const view = new DataView(randomBytes.buffer);
	let memberId = view.getBigUint64(0, false); // false = big-endian

	// Mask to positive 64-bit integer range (same as Long.MAX_VALUE)
	const LONG_MAX_VALUE = 0x7fffffffffffffffn;
	memberId = memberId & LONG_MAX_VALUE;

	return memberId;
}

/**
 * Generate a session ID for WebSocket connection.
 * RuneLite party server requires a session ID in the WebSocket URL.
 *
 * @returns A UUID v4 formatted string
 */
export function generateSessionId(): string {
	// Generate a UUID v4
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	// Set version (4) and variant bits
	bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
	bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant 10

	// Convert to UUID string format
	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32),
	].join("-");
}
