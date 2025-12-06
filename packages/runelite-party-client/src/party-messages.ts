/**
 * Party-specific protobuf message builders and readers.
 * Wraps protobuf-core functions with party-specific logic.
 */

import {
	decodePartyData,
	decodeS2C,
	decodeUserJoin,
	decodeUserPart,
	encodeC2S,
} from "./protobuf-core.js";
import type {
	C2S,
	Data,
	Join,
	Part,
	PartyData,
	S2C,
	UserJoin,
	UserPart,
} from "./types.js";

/**
 * Build a Join message for C2S
 */
export function buildJoinMessage(partyId: bigint, memberId: bigint): C2S {
	const join: Join = { partyId, memberId };
	return { msgCase: "join", join };
}

/**
 * Build a Part message for C2S
 */
export function buildPartMessage(): C2S {
	const part: Part = {};
	return { msgCase: "part", part };
}

/**
 * Build a Data message for C2S
 */
export function buildDataMessage(type: string, data: Uint8Array): C2S {
	const dataMessage: Data = { type, data };
	return { msgCase: "data", data: dataMessage };
}

/**
 * Encode a C2S message to binary
 */
export async function encodeC2SMessage(message: C2S): Promise<Uint8Array> {
	return await encodeC2S(message);
}

/**
 * Read and decode an S2C message from binary
 */
export async function readS2CMessage(data: Uint8Array): Promise<S2C> {
	return await decodeS2C(data);
}

/**
 * Read and decode a UserJoin message from binary
 */
export async function readUserJoin(data: Uint8Array): Promise<UserJoin> {
	return await decodeUserJoin(data);
}

/**
 * Read and decode a UserPart message from binary
 */
export async function readUserPart(data: Uint8Array): Promise<UserPart> {
	return await decodeUserPart(data);
}

/**
 * Read and decode a PartyData message from binary
 */
export async function readPartyData(data: Uint8Array): Promise<PartyData> {
	return await decodePartyData(data);
}

// Re-export low-level functions for advanced use cases
export { encodeData, encodeJoin, encodePart } from "./protobuf-core.js";
