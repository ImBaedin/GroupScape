/**
 * TypeScript type definitions for RuneLite Party protobuf messages.
 * These match the Java protobuf structure from the RuneLite party system.
 */

/**
 * Client to Server message types
 */

/** Join message (c->s): Request to join a party */
export interface Join {
	partyId: bigint;
	memberId: bigint;
}

/** Part message (c->s): Request to leave the current party */
export type Part = Record<string, never>;

/** Data message (c->s): Send data to the party */
export interface Data {
	type: string;
	data: Uint8Array;
}

/** Client to Server wrapper message */
export type C2S =
	| { msgCase: "join"; join: Join }
	| { msgCase: "part"; part: Part }
	| { msgCase: "data"; data: Data }
	| { msgCase: "MSG_NOT_SET" };

/**
 * Server to Client message types
 */

/** UserJoin message (s->c): Notification that a user joined a party */
export interface UserJoin {
	partyId: bigint;
	memberId: bigint;
}

/** UserPart message (s->c): Notification that a user left a party */
export interface UserPart {
	partyId: bigint;
	memberId: bigint;
}

/** PartyData message (s->c): Data received from a party member */
export interface PartyData {
	partyId: bigint;
	memberId: bigint;
	data: Uint8Array;
	type: string;
}

/** Server to Client wrapper message */
export type S2C =
	| { msgCase: "join"; join: UserJoin }
	| { msgCase: "part"; part: UserPart }
	| { msgCase: "data"; data: PartyData }
	| { msgCase: "MSG_NOT_SET" };
