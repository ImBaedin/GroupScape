import { api } from "@GroupScape/backend/convex/_generated/api";
import type { Doc } from "@GroupScape/backend/convex/_generated/dataModel";

export type PartyMember = Doc<"parties">["members"][number];

export type PartyDoc = NonNullable<(typeof api.parties.get)["_returnType"]>;
export type PlayerAccount = NonNullable<
	(typeof api.playerAccounts.list)["_returnType"]
>[number];
export type MemberProfile = NonNullable<
	(typeof api.playerAccounts.getMemberProfiles)["_returnType"]
>[number];

export type AppUser = (typeof api.users.getCurrent)["_returnType"];
export type PartyLock = (typeof api.parties.getActiveForUser)["_returnType"];

export type PartyStatus = "open" | "closed";

export type CombatSkillsSummary = {
	attack: number;
	strength: number;
	defence: number;
	hitpoints: number;
	ranged: number;
	magic: number;
	prayer: number;
};

export type BossKcSummary = {
	key: string;
	label: string;
	score: number;
	rank: number;
};

export type StatsSummary = {
	combatLevel: number;
	totalLevel: number;
	combatSkills: CombatSkillsSummary;
	bossKc: BossKcSummary[];
};
