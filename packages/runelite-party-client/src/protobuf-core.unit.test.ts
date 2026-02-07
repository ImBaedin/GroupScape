import {
	bigintToLong,
	decodeS2C,
	encodeC2S,
	getRoot,
} from "./protobuf-core";
import { describe, expect, it } from "vitest";

describe("protobuf-core", () => {
	it("encodes C2S join messages", async () => {
		const root = await getRoot();
		const C2SType = root.lookupType("party.C2S");
		const encoded = await encodeC2S({
			msgCase: "join",
			join: { partyId: 123n, memberId: 456n },
		});

		const decoded = C2SType.decode(encoded) as unknown as {
			join: { partyId: { toString(): string }; memberId: { toString(): string } };
		};
		expect(decoded.join.partyId.toString()).toBe("123");
		expect(decoded.join.memberId.toString()).toBe("456");
	});

	it("encodes C2S data messages", async () => {
		const root = await getRoot();
		const C2SType = root.lookupType("party.C2S");
		const encoded = await encodeC2S({
			msgCase: "data",
			data: { type: "StatusUpdate", data: new Uint8Array([1, 2, 3]) },
		});

		const decoded = C2SType.decode(encoded) as unknown as {
			data: { type: string; data: Uint8Array };
		};
		expect(decoded.data.type).toBe("StatusUpdate");
		expect(new Uint8Array(decoded.data.data)).toEqual(new Uint8Array([1, 2, 3]));
	});

	it("encodes C2S part messages", async () => {
		const root = await getRoot();
		const C2SType = root.lookupType("party.C2S");
		const encoded = await encodeC2S({
			msgCase: "part",
			part: {},
		});

		const decoded = C2SType.decode(encoded) as unknown as {
			part: Record<string, never>;
		};
		expect(decoded.part).toEqual({});
	});

	it("decodes S2C join, part, and data messages", async () => {
		const root = await getRoot();
		const S2CType = root.lookupType("party.S2C");

		const joinEncoded = S2CType.encode({
			join: {
				partyId: bigintToLong(11n),
				memberId: bigintToLong(22n),
			},
		}).finish();
		await expect(decodeS2C(new Uint8Array(joinEncoded))).resolves.toEqual({
			msgCase: "join",
			join: { partyId: 11n, memberId: 22n },
		});

		const partEncoded = S2CType.encode({
			part: {
				partyId: bigintToLong(33n),
				memberId: bigintToLong(44n),
			},
		}).finish();
		await expect(decodeS2C(new Uint8Array(partEncoded))).resolves.toEqual({
			msgCase: "part",
			part: { partyId: 33n, memberId: 44n },
		});

		const dataEncoded = S2CType.encode({
			data: {
				partyId: bigintToLong(55n),
				memberId: bigintToLong(66n),
				type: "PartyBatchedChange",
				data: new Uint8Array([9, 8, 7]),
			},
		}).finish();
		await expect(decodeS2C(new Uint8Array(dataEncoded))).resolves.toEqual({
			msgCase: "data",
			data: {
				partyId: 55n,
				memberId: 66n,
				type: "PartyBatchedChange",
				data: new Uint8Array([9, 8, 7]),
			},
		});
	});

	it("returns MSG_NOT_SET when S2C has no message payload", async () => {
		const root = await getRoot();
		const S2CType = root.lookupType("party.S2C");
		const encoded = S2CType.encode({}).finish();

		await expect(decodeS2C(new Uint8Array(encoded))).resolves.toEqual({
			msgCase: "MSG_NOT_SET",
		});
	});
});
