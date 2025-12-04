/**
 * Protobuf implementation for RuneLite Party messages.
 * Uses protobufjs to encode/decode messages matching the Java protobuf structure.
 */

import * as protobuf from "protobufjs";

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

// Define the protobuf schema matching the Java proto definition
const protoDefinition = `
syntax = "proto3";

package party;

// Client to Server messages
message Join {
  int64 partyId = 1;
  int64 memberId = 2;
}

message Part {
}

message Data {
  bytes data = 1;
  string type = 2;
}

message C2S {
  oneof msg {
    Join join = 1;
    Part part = 2;
    Data data = 3;
  }
}

// Server to Client messages
message UserJoin {
  int64 partyId = 1;
  int64 memberId = 2;
}

message UserPart {
  int64 partyId = 1;
  int64 memberId = 2;
}

message PartyData {
  int64 partyId = 1;
  int64 memberId = 2;
  bytes data = 3;
  string type = 4;
}

message S2C {
  oneof msg {
    UserJoin join = 1;
    UserPart part = 2;
    PartyData data = 3;
  }
}
`;

let root: protobuf.Root | null = null;

/**
 * Initialize the protobuf root from the schema definition
 */
async function getRoot(): Promise<protobuf.Root> {
	if (!root) {
		root = protobuf.parse(protoDefinition, { keepCase: true }).root;
	}
	return root;
}

/**
 * Convert bigint to Long for protobuf (protobufjs uses Long for int64)
 */
function bigintToLong(value: bigint): protobuf.util.Long {
	return protobuf.util.Long.fromString(value.toString(), false);
}

/**
 * Convert Long or string/number to bigint from protobuf
 */
function longToBigint(
	value: protobuf.util.Long | string | number | bigint,
): bigint {
	if (protobuf.util.Long.isLong(value)) {
		// Convert Long to bigint using toString
		return BigInt(value.toString());
	}
	return BigInt(value);
}

/**
 * Encode a Join message to binary
 */
export async function encodeJoin(message: Join): Promise<Uint8Array> {
	const root = await getRoot();
	const JoinType = root.lookupType("party.Join");
	const payload = {
		partyId: bigintToLong(message.partyId),
		memberId: bigintToLong(message.memberId),
	};
	const errMsg = JoinType.verify(payload);
	if (errMsg) {
		throw new Error(`Join message verification failed: ${errMsg}`);
	}
	const buffer = JoinType.encode(payload).finish();
	return new Uint8Array(buffer);
}

/**
 * Encode a Part message to binary
 */
export async function encodePart(_message: Part): Promise<Uint8Array> {
	const root = await getRoot();
	const PartType = root.lookupType("party.Part");
	const buffer = PartType.encode({}).finish();
	return new Uint8Array(buffer);
}

/**
 * Encode a Data message to binary
 */
export async function encodeData(message: Data): Promise<Uint8Array> {
	const root = await getRoot();
	const DataType = root.lookupType("party.Data");
	const errMsg = DataType.verify({
		data: message.data,
		type: message.type,
	});
	if (errMsg) {
		throw new Error(`Data message verification failed: ${errMsg}`);
	}
	const buffer = DataType.encode({
		data: message.data,
		type: message.type,
	}).finish();
	return new Uint8Array(buffer);
}

/**
 * Encode a C2S message to binary
 */
export async function encodeC2S(message: C2S): Promise<Uint8Array> {
	const root = await getRoot();
	const C2SType = root.lookupType("party.C2S");

	let payload: protobuf.Message<object>;
	switch (message.msgCase) {
		case "join": {
			payload = {
				join: {
					partyId: bigintToLong(message.join.partyId),
					memberId: bigintToLong(message.join.memberId),
				},
			};
			break;
		}
		case "part": {
			payload = { part: {} };
			break;
		}
		case "data": {
			payload = {
				data: {
					data: message.data.data,
					type: message.data.type,
				},
			};
			break;
		}
		default:
			throw new Error(`Invalid C2S message case: ${message.msgCase}`);
	}

	const errMsg = C2SType.verify(payload);
	if (errMsg) {
		throw new Error(`C2S message verification failed: ${errMsg}`);
	}

	const buffer = C2SType.encode(payload).finish();
	return new Uint8Array(buffer);
}

/**
 * Decode a UserJoin message from binary
 */
export async function decodeUserJoin(data: Uint8Array): Promise<UserJoin> {
	const root = await getRoot();
	const UserJoinType = root.lookupType("party.UserJoin");
	const message = UserJoinType.decode(data);
	const errMsg = UserJoinType.verify(message);
	if (errMsg) {
		throw new Error(`UserJoin message verification failed: ${errMsg}`);
	}
	return {
		partyId: longToBigint(message.partyId),
		memberId: longToBigint(message.memberId),
	};
}

/**
 * Decode a UserPart message from binary
 */
export async function decodeUserPart(data: Uint8Array): Promise<UserPart> {
	const root = await getRoot();
	const UserPartType = root.lookupType("party.UserPart");
	const message = UserPartType.decode(data);
	const errMsg = UserPartType.verify(message);
	if (errMsg) {
		throw new Error(`UserPart message verification failed: ${errMsg}`);
	}
	return {
		partyId: longToBigint(message.partyId),
		memberId: longToBigint(message.memberId),
	};
}

/**
 * Decode a PartyData message from binary
 */
export async function decodePartyData(data: Uint8Array): Promise<PartyData> {
	const root = await getRoot();
	const PartyDataType = root.lookupType("party.PartyData");
	const message = PartyDataType.decode(data);
	const errMsg = PartyDataType.verify(message);
	if (errMsg) {
		throw new Error(`PartyData message verification failed: ${errMsg}`);
	}
	return {
		partyId: longToBigint(message.partyId),
		memberId: longToBigint(message.memberId),
		data: new Uint8Array(message.data),
		type: message.type,
	};
}

/**
 * Decode an S2C message from binary
 */
export async function decodeS2C(data: Uint8Array): Promise<S2C> {
	const root = await getRoot();
	const S2CType = root.lookupType("party.S2C");
	const message = S2CType.decode(data);
	const errMsg = S2CType.verify(message);
	if (errMsg) {
		throw new Error(`S2C message verification failed: ${errMsg}`);
	}

	if (message.join) {
		return {
			msgCase: "join",
			join: {
				partyId: longToBigint(message.join.partyId),
				memberId: longToBigint(message.join.memberId),
			},
		};
	}
	if (message.part) {
		return {
			msgCase: "part",
			part: {
				partyId: longToBigint(message.part.partyId),
				memberId: longToBigint(message.part.memberId),
			},
		};
	}
	if (message.data) {
		return {
			msgCase: "data",
			data: {
				partyId: longToBigint(message.data.partyId),
				memberId: longToBigint(message.data.memberId),
				data: new Uint8Array(message.data.data),
				type: message.data.type,
			},
		};
	}

	return { msgCase: "MSG_NOT_SET" };
}
