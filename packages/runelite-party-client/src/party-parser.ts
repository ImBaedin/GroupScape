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
		out.push({ id: arr[i], qty: arr[i + 1] ?? 0 });
	}
	return out;
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
function parseMisc(mArr: Array<any>) {
	// return a map code -> value and an annotated object
	const map: Record<string, any> = {};
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
export function parsePartyBatchedChange(obj: any) {
	const inventory = Array.isArray(obj.i) ? chunkPairs(obj.i) : [];
	const equipment = Array.isArray(obj.e) ? chunkPairs(obj.e) : [];
	const skills = Array.isArray(obj.s) ? parseSkills(obj.s) : [];
	const misc = Array.isArray(obj.m)
		? parseMisc(obj.m)
		: { rawMap: {}, interpreted: {} };

	return {
		type: obj.type,
		inventory,
		equipment,
		skills,
		misc,
		ap: obj.ap,
		ep: obj.ep,
		up: obj.up,
		rp: obj.rp,
		q: obj.q ?? [],
	};
}
