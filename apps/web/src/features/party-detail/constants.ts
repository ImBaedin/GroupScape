import type { CombatSkillsSummary } from "./types";

export const statusLabels = {
	unverified: "Unverified",
	pending: "Pending",
	verified: "Verified",
} as const;

export type VerificationStatus = keyof typeof statusLabels;

export const COMBAT_SKILL_LABELS: Array<{
	key: keyof CombatSkillsSummary;
	label: string;
	icon: string;
}> = [
	{ key: "attack", label: "Atk", icon: "/ui/skills/attack.png" },
	{ key: "strength", label: "Str", icon: "/ui/skills/strength.png" },
	{ key: "defence", label: "Def", icon: "/ui/skills/defence.png" },
	{ key: "hitpoints", label: "HP", icon: "/ui/skills/hitpoints.png" },
	{ key: "ranged", label: "Rng", icon: "/ui/skills/ranged.png" },
	{ key: "magic", label: "Mag", icon: "/ui/skills/magic.png" },
	{ key: "prayer", label: "Pray", icon: "/ui/skills/prayer.png" },
];
