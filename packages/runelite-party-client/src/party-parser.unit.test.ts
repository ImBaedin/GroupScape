import { parsePartyBatchedChange } from "./party-parser";
import { describe, expect, it } from "vitest";

describe("parsePartyBatchedChange", () => {
	it("chunks pair arrays and pads odd-length arrays with qty 0", () => {
		const parsed = parsePartyBatchedChange({
			i: [4151, 1, 995],
			e: [11840, 1, 6739],
			q: [11212, 25, 11230],
		});

		expect(parsed.inventory).toEqual([
			{ id: 4151, qty: 1 },
			{ id: 995, qty: 0 },
		]);
		expect(parsed.equipment).toEqual([
			{ id: 11840, qty: 1 },
			{ id: 6739, qty: 0 },
		]);
		expect(parsed.quiver).toEqual([
			{ id: 11212, qty: 25 },
			{ id: 11230, qty: 0 },
		]);
	});

	it("unpacks rune pouch values from packed integers", () => {
		const runeId = 554;
		const runeQty = 4_321;
		const packed = (runeQty << 18) | runeId;

		const parsed = parsePartyBatchedChange({
			rp: [packed],
		});

		expect(parsed.runePouch).toEqual([{ id: runeId, qty: runeQty }]);
	});

	it("falls back for unknown skills and missing misc payload", () => {
		const parsed = parsePartyBatchedChange({
			s: [{ s: 999, l: 42, b: 43 }],
		});

		expect(parsed.skills).toEqual([
			{
				index: 999,
				name: "skill#999",
				level: 42,
				base: 43,
			},
		]);
		expect(parsed.misc).toEqual({
			rawMap: {},
			interpreted: {
				username: null,
				world: null,
				combatLevel: null,
				totalLevel: null,
				specialState: null,
				prayerActive: null,
				deityOrDead: null,
				runEnergyOrRatio: null,
				S: null,
			},
		});
	});
});
