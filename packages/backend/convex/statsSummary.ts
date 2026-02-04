import { v } from "convex/values";
import type { Stats } from "./osrsHiscores";

export const STATS_STALE_MS = 6 * 60 * 60 * 1000;

export const statsSummaryValidator = v.object({
	combatLevel: v.number(),
	totalLevel: v.number(),
	combatSkills: v.object({
		attack: v.number(),
		strength: v.number(),
		defence: v.number(),
		hitpoints: v.number(),
		ranged: v.number(),
		magic: v.number(),
		prayer: v.number(),
	}),
	bossKc: v.array(
		v.object({
			key: v.string(),
			label: v.string(),
			score: v.number(),
			rank: v.number(),
		}),
	),
});

export type StatsSummary = {
	combatLevel: number;
	totalLevel: number;
	combatSkills: {
		attack: number;
		strength: number;
		defence: number;
		hitpoints: number;
		ranged: number;
		magic: number;
		prayer: number;
	};
	bossKc: Array<{
		key: string;
		label: string;
		score: number;
		rank: number;
	}>;
};

const KEY_BOSS_KC: Array<{ key: keyof Stats["bosses"]; label: string }> = [
	{ key: "chambersOfXeric", label: "Chambers of Xeric" },
	{ key: "chambersOfXericChallengeMode", label: "Chambers CM" },
	{ key: "theatreOfBlood", label: "Theatre of Blood" },
	{ key: "theatreOfBloodHardMode", label: "Theatre HM" },
	{ key: "tombsOfAmascut", label: "Tombs of Amascut" },
	{ key: "tombsOfAmascutExpertMode", label: "Tombs Expert" },
	{ key: "nex", label: "Nex" },
	{ key: "vorkath", label: "Vorkath" },
	{ key: "zulrah", label: "Zulrah" },
	{ key: "alchemicalHydra", label: "Hydra" },
	{ key: "gauntlet", label: "Gauntlet" },
	{ key: "corruptedGauntlet", label: "Corrupted Gauntlet" },
];

const computeCombatLevel = (skills: Stats["skills"]): number => {
	const attack = skills.attack.level;
	const strength = skills.strength.level;
	const defence = skills.defence.level;
	const hitpoints = skills.hitpoints.level;
	const prayer = skills.prayer.level;
	const ranged = skills.ranged.level;
	const magic = skills.magic.level;

	const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
	const melee = 0.325 * (attack + strength);
	const rangedScore = 0.325 * Math.floor(ranged * 1.5);
	const magicScore = 0.325 * Math.floor(magic * 1.5);

	return Math.floor(base + Math.max(melee, rangedScore, magicScore));
};

export const buildStatsSummary = (stats: Stats): StatsSummary => {
	const combatSkills = {
		attack: stats.skills.attack.level,
		strength: stats.skills.strength.level,
		defence: stats.skills.defence.level,
		hitpoints: stats.skills.hitpoints.level,
		ranged: stats.skills.ranged.level,
		magic: stats.skills.magic.level,
		prayer: stats.skills.prayer.level,
	};

	return {
		combatLevel: computeCombatLevel(stats.skills),
		totalLevel: stats.skills.overall.level,
		combatSkills,
		bossKc: KEY_BOSS_KC.map(({ key, label }) => ({
			key,
			label,
			score: stats.bosses[key]?.score ?? -1,
			rank: stats.bosses[key]?.rank ?? -1,
		})),
	};
};
