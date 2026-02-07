import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
	isTypeRegistered,
	processPartyData,
	registerPartyDataType,
} from "./party-data-pipeline";

describe("party-data-pipeline", () => {
	it("registers and runs custom handlers", () => {
		const type = "CustomTypeForTest";
		registerPartyDataType(type, {
			schema: z.object({ value: z.number().int() }),
			transform: (data) => ({ doubled: data.value * 2 }),
		});

		expect(isTypeRegistered(type)).toBe(true);
		expect(processPartyData(type, { value: 21 })).toEqual({
			success: true,
			data: { doubled: 42 },
		});
	});

	it("returns validation errors for invalid payloads", () => {
		const result = processPartyData("PartyBatchedChange", {
			m: [{ t: "NOT_A_REAL_MISC_TYPE", v: 1 }],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.message).toContain("Validation failed");
		}
	});

	it("returns handler-not-found for unknown types", () => {
		const result = processPartyData("UnknownTypeThatIsNotRegistered", {});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.message).toContain("No handler registered");
		}
	});

	it("transforms built-in PartyBatchedChange payloads", () => {
		const result = processPartyData("PartyBatchedChange", {
			type: "PartyBatchedChange",
			i: [4151, 1],
		});

		expect(result).toEqual({
			success: true,
			data: expect.objectContaining({
				type: "PartyBatchedChange",
				inventory: [{ id: 4151, qty: 1 }],
			}),
		});
	});

	it("transforms built-in StatusUpdate payloads including member color", () => {
		const result = processPartyData("StatusUpdate", {
			type: "StatusUpdate",
			n: "Baedin",
			hc: 90,
			hm: 99,
			c: "#80ff0000",
		});

		expect(result).toEqual({
			success: true,
			data: {
				type: "StatusUpdate",
				name: "Baedin",
				health: { current: 90, max: 99 },
				prayer: { current: undefined, max: undefined },
				runEnergy: undefined,
				specEnergy: undefined,
				vengeanceActive: undefined,
				memberColor: { a: 128, r: 255, g: 0, b: 0 },
			},
		});
	});

	it("transforms built-in LocationUpdate coordinate payloads", () => {
		const x = 3_200;
		const y = 3_216;
		const plane = 2;
		const encoded = (plane << 28) | (x << 14) | y;

		const result = processPartyData("LocationUpdate", {
			type: "LocationUpdate",
			c: encoded,
		});

		expect(result).toEqual({
			success: true,
			data: {
				type: "LocationUpdate",
				coordinate: {
					encoded,
					x,
					y,
					plane,
				},
			},
		});
	});
});
