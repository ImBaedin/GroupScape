import type { CombatSkillKey } from "../types";

export const statusLabels = {
	unverified: "Unverified",
	pending: "Pending",
	verified: "Verified",
} as const;

export const COMBAT_SKILL_LABELS: Array<{
	key: CombatSkillKey;
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

export const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;

export const formatSkillLabel = (skill: string) =>
	skill ? `${skill[0].toUpperCase()}${skill.slice(1)}` : "";

export const getAccountInitials = (username: string) => {
	const base = username.trim();
	if (!base) return "GS";
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0]?.slice(0, 2).toUpperCase();
	}
	return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
};

export const formatRemaining = (remainingMs: number) => {
	const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	if (seconds === 0) return `${minutes}m`;
	return `${minutes}m ${seconds}s`;
};
