/**
 * Protobuf implementation for RuneLite Party messages.
 * Re-exports from protobuf-core and party-messages for backward compatibility.
 */

// Re-export party message builders and readers from party-messages
export {
	buildDataMessage,
	buildJoinMessage,
	buildPartMessage,
	encodeC2SMessage,
	readPartyData,
	readS2CMessage,
	readUserJoin,
	readUserPart,
} from "./party-messages.js";
// Re-export all encoding/decoding functions from protobuf-core
export {
	decodePartyData,
	decodeS2C,
	decodeUserJoin,
	decodeUserPart,
	encodeC2S,
	encodeData,
	encodeJoin,
	encodePart,
} from "./protobuf-core.js";
