// party-parse.ts
// Run in Node or browser. No protobuf here — input is already the parsed JSON object.

const SKILL_NAMES = [
	"Attack",
	"Defence",
	"Strength",
	"Hitpoints",
	"Ranged",
	"Prayer",
	"Magic",
	"Cooking",
	"Woodcutting",
	"Fletching",
	"Fishing",
	"Firemaking",
	"Crafting",
	"Smithing",
	"Mining",
	"Herblore",
	"Agility",
	"Thieving",
	"Slayer",
	"Farming",
	"Runecraft",
	"Hunter",
	"Construction",
	"Sailing",
];

function chunkPairs(arr: number[]) {
	const out: Array<{ id: number; qty: number }> = [];
	for (let i = 0; i < arr.length; i += 2) {
		const id = arr[i];
		const qty = arr[i + 1];
		if (id !== undefined) {
			out.push({ id, qty: qty ?? 0 });
		}
	}
	return out;
}

/**
 * Unpack a rune pouch item from a packed integer
 * @param packed - The packed integer containing itemId and quantity
 * @returns Object with id and qty
 */
function unpackRune(packed: number): { id: number; qty: number } {
	// Quantity is stored in the leftmost 14 bits (bits 18-31)
	const qty = packed >>> 18;
	// Item ID is stored in the rightmost 18 bits (bits 0-17)
	const itemId = packed & 0x3ffff;
	return { id: itemId, qty };
}

function parseSkills(sArr: Array<{ s: number; l: number; b: number }>) {
	return sArr.map((si) => {
		const idx = si.s;
		const name = SKILL_NAMES[idx] ?? `skill#${idx}`;
		return { index: idx, name, level: si.l, base: si.b };
	});
}

/**
 * Heuristic mapping for the small misc array 'm' found in your object.
 * These mappings are inferred from client fields (not 100% authoritative).
 */
function parseMisc(mArr: Array<{ t: string; v?: unknown; s?: unknown }>) {
	// return a map code -> value and an annotated object
	const map: Record<string, unknown> = {};
	for (const entry of mArr) {
		const type = entry.t;
		const value = entry.v ?? entry.s ?? null;
		map[type] = value;
	}
	// Inferred human-readable names (best-effort):
	const human = {
		username: map.U ?? null, // U: { s: "username" } observed
		world: map.W ?? null, // W: likely world number
		combatLevel: map.C ?? null, // C: likely combat level (example value 118)
		totalLevel: map.T ?? null, // T: likely total level (2075 in sample)
		specialState: map.ST ?? null, // ST: small state flag (0/1)
		prayerActive: map.P ?? null, // P: maybe prayer or prayer ticks
		deityOrDead: map.D ?? null, // D: unknown in sample (0)
		runEnergyOrRatio: map.R ?? null, // R: often large (in sample: 10000) — may be XP or scaled value
		S: map.S ?? null, // S: small (100) — could be current health% or another state
		// add others as you discover them...
	} as const;

	return { rawMap: map, interpreted: human };
}

// top-level parser
export function parsePartyBatchedChange(obj: {
	type?: string;
	i?: number[];
	e?: number[];
	s?: Array<{ s: number; l: number; b: number }>;
	m?: Array<{ t: string; v?: unknown; s?: unknown }>;
	ap?: unknown;
	ep?: unknown;
	up?: unknown;
	rp?: number[];
	q?: number[];
}) {
	const inventory = Array.isArray(obj.i) ? chunkPairs(obj.i) : [];
	const equipment = Array.isArray(obj.e) ? chunkPairs(obj.e) : [];
	const skills = Array.isArray(obj.s) ? parseSkills(obj.s) : [];
	const misc = Array.isArray(obj.m)
		? parseMisc(obj.m)
		: {
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
			};

	const runePouch = Array.isArray(obj.rp) ? obj.rp.map(unpackRune) : [];
	const quiver = Array.isArray(obj.q) ? chunkPairs(obj.q) : [];

	return {
		type: obj.type,
		inventory,
		equipment,
		skills,
		misc,
		availablePrayers: obj.ap,
		enabledPrayers: obj.ep,
		unlockedPrayers: obj.up,
		runePouch,
		quiver,
	};
}
