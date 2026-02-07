import { z } from "zod";

// Helpers

const partySizeRange = (min: number, max: number) => {
	return {
		minPartySize: z.literal(min),
		maxPartySize: z.literal(max),
	};
};

// Schemas

const filtersSchema = z.object({
	label: z.literal("GIVE ME A LABEL"),
	type: z.enum(["killCount", "totalLevel", "combatLevel", "specificLevel"]),
});

const killCountFilterSchema = filtersSchema.extend({
	label: z.literal("Kill Count"),
	type: z.literal("killCount"),
	value: z.number().int().min(1),
});

const totalLevelFilterSchema = filtersSchema.extend({
	label: z.literal("Total Level"),
	type: z.literal("totalLevel"),
	value: z.number().int().min(1).max(2376),
});

const combatLevelFilterSchema = filtersSchema.extend({
	label: z.literal("Combat Level"),
	type: z.literal("combatLevel"),
	value: z.number().int().min(1).max(126),
});

const staminaDurationFilterSchema = filtersSchema.extend({
	label: z.literal("Specific Skill Level"),
	type: z.literal("specificLevel"),
	skill: z.enum([
		"attack",
		"defence",
		"strength",
		"hitpoints",
		"ranged",
		"prayer",
		"magic",
		"cooking",
		"woodcutting",
		"fletching",
		"fishing",
		"firemaking",
		"crafting",
		"smithing",
		"mining",
		"herblore",
		"agility",
		"thieving",
		"slayer",
		"farming",
		"runecraft",
		"hunter",
		"construction",
		"sailing",
	]),
	value: z.number().int().min(1).max(99),
});

export const filtersUnionSchema = z.union([
	killCountFilterSchema,
	totalLevelFilterSchema,
	combatLevelFilterSchema,
	staminaDurationFilterSchema,
]);

const baseContentSchema = z.object({
	contentName: z.literal("GIVE ME A NAME"),
	contentDescription: z.literal("GIVE ME A DESCRIPTION"),
	/**
	 * Party leader determines this limit within the bounds of the party size range
	 */
	partySizeLimit: z.number().int().min(2).max(254),
	/**
	 * Party leader can apply filters so that only players matching the filters can see/join the party
	 */
	filters: z.array(filtersUnionSchema),
});

const royalTitansSchema = baseContentSchema.extend({
	contentName: z.literal("Royal Titans"),
	contentDescription: z.literal("Branda and Eldric, fire and ice"),
	...partySizeRange(2, 2),
});

const barbarianAssaultSchema = baseContentSchema.extend({
	contentName: z.literal("Barbarian Assault"),
	contentDescription: z.literal("RuneScape's most iconic raid"),
	...partySizeRange(5, 5),
});

const theatreOfBloodSchema = baseContentSchema.extend({
	contentName: z.literal("Theatre of Blood"),
	contentDescription: z.literal("Verzik Vitur and her band of bloody besties"),
	...partySizeRange(2, 5),
});

export const contentScema = z.discriminatedUnion("contentName", [
	royalTitansSchema,
	barbarianAssaultSchema,
	theatreOfBloodSchema,
]);
