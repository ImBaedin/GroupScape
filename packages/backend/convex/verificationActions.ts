/**
 * Verification task generation for predictable XP deltas.
 *
 * Purpose:
 * - Provide deterministic, low-friction tasks that can be verified via hiscores
 *   XP changes (no client trust required).
 *
 * Use cases:
 * - Start verification by generating a small set of tasks tailored to a
 *   player's current skill levels.
 * - Compute expected XP deltas when checking verification progress.
 *
 * Design decisions:
 * - Tasks are generated from resource tables rather than hardcoded actions so
 *   we can scale to more skills by data entry, not code changes.
 * - Only allow task counts that yield whole-number XP totals because the
 *   hiscores API returns integer XP values.
 * - Keep tasks small and early-game friendly to reduce friction for new users.
 */
export type VerificationSkill =
	| "woodcutting"
	| "fishing"
	| "cooking"
	| "fletching"
	| "runecraft";

export type VerificationTask = {
	id: string;
	skill: VerificationSkill;
	expectedXp: number;
	instructions: string;
	amount: number;
	resourceId: string;
};

export type SkillSnapshot = {
	level: number;
	xp: number;
};

export type SkillSnapshots = Partial<Record<VerificationSkill, SkillSnapshot>>;

type VerificationResource = {
	id: string;
	minLevel: number;
	xpPerUnit: number;
	minUnits: number;
	maxUnits: number;
	itemSingular: string;
	itemPlural: string;
	suffix?: string;
	instructionTemplate?: string;
};

type VerificationGroup = {
	skill: VerificationSkill;
	verb: string;
	resources: VerificationResource[];
};

type RandomSource = () => number;

type ResourceOption = {
	group: VerificationGroup;
	resource: VerificationResource;
	counts: number[];
};

const VERIFICATION_GROUPS: VerificationGroup[] = [
	{
		skill: "woodcutting",
		verb: "Chop",
		resources: [
			{
				id: "normal_log",
				minLevel: 1,
				xpPerUnit: 25,
				minUnits: 4,
				maxUnits: 12,
				itemSingular: "normal log",
				itemPlural: "normal logs",
			},
			{
				id: "oak_log",
				minLevel: 15,
				xpPerUnit: 37.5,
				minUnits: 4,
				maxUnits: 10,
				itemSingular: "oak log",
				itemPlural: "oak logs",
			},
			{
				id: "willow_log",
				minLevel: 30,
				xpPerUnit: 67.5,
				minUnits: 2,
				maxUnits: 6,
				itemSingular: "willow log",
				itemPlural: "willow logs",
			},
			{
				id: "teak_log",
				minLevel: 35,
				xpPerUnit: 85,
				minUnits: 2,
				maxUnits: 5,
				itemSingular: "teak log",
				itemPlural: "teak logs",
			},
			{
				id: "maple_log",
				minLevel: 45,
				xpPerUnit: 100,
				minUnits: 2,
				maxUnits: 4,
				itemSingular: "maple log",
				itemPlural: "maple logs",
			},
			{
				id: "mahogany_log",
				minLevel: 50,
				xpPerUnit: 125,
				minUnits: 1,
				maxUnits: 3,
				itemSingular: "mahogany log",
				itemPlural: "mahogany logs",
			},
			{
				id: "yew_log",
				minLevel: 60,
				xpPerUnit: 175,
				minUnits: 1,
				maxUnits: 2,
				itemSingular: "yew log",
				itemPlural: "yew logs",
			},
			{
				id: "magic_log",
				minLevel: 75,
				xpPerUnit: 250,
				minUnits: 1,
				maxUnits: 2,
				itemSingular: "magic log",
				itemPlural: "magic logs",
			},
			{
				id: "redwood_log",
				minLevel: 90,
				xpPerUnit: 380,
				minUnits: 1,
				maxUnits: 1,
				itemSingular: "redwood log",
				itemPlural: "redwood logs",
			},
		],
	},
	{
		skill: "fishing",
		verb: "Catch",
		resources: [
			{
				id: "shrimp",
				minLevel: 1,
				xpPerUnit: 10,
				minUnits: 8,
				maxUnits: 20,
				itemSingular: "raw shrimp",
				itemPlural: "raw shrimps",
			},
		],
	},
	{
		skill: "cooking",
		verb: "Successfully cook",
		resources: [
			{
				id: "shrimp",
				minLevel: 1,
				xpPerUnit: 30,
				minUnits: 3,
				maxUnits: 8,
				itemSingular: "shrimp",
				itemPlural: "shrimps",
			},
		],
	},
	{
		skill: "fletching",
		verb: "Fletch",
		resources: [
			{
				id: "arrow_shafts",
				minLevel: 1,
				xpPerUnit: 5,
				minUnits: 12,
				maxUnits: 30,
				itemSingular: "normal log",
				itemPlural: "normal logs",
				suffix: "into arrow shafts",
			},
		],
	},
	{
		skill: "runecraft",
		verb: "Craft",
		resources: [
			{
				id: "air_runes",
				minLevel: 1,
				xpPerUnit: 5,
				minUnits: 16,
				maxUnits: 30,
				itemSingular: "air rune",
				itemPlural: "air runes",
				instructionTemplate:
					"Use {count} rune essence at the air altar to craft air runes.",
			},
		],
	},
];

const getSkillLevel = (skills: SkillSnapshots, skill: VerificationSkill) =>
	skills[skill]?.level ?? 0;

const getSkillXp = (skills: SkillSnapshots, skill: VerificationSkill): number =>
	skills[skill]?.xp ?? 0;

const pickRandom = <T,>(items: T[], rng: RandomSource): T =>
	items[Math.floor(rng() * items.length)];

// Hiscores API returns integer XP, so only allow counts that yield whole XP totals.
const isWholeNumber = (value: number) =>
	Math.abs(value - Math.round(value)) < 0.000001;

const getCountOptions = (resource: VerificationResource): number[] => {
	const counts: number[] = [];

	for (let count = resource.minUnits; count <= resource.maxUnits; count += 1) {
		const totalXp = resource.xpPerUnit * count;
		if (isWholeNumber(totalXp)) {
			counts.push(count);
		}
	}

	return counts;
};

const formatInstruction = (
	group: VerificationGroup,
	resource: VerificationResource,
	amount: number,
): string => {
	const itemLabel = amount === 1 ? resource.itemSingular : resource.itemPlural;

	if (resource.instructionTemplate) {
		return resource.instructionTemplate
			.replace("{count}", amount.toString())
			.replace("{item}", itemLabel)
			.replace("{items}", itemLabel);
	}

	const suffix = resource.suffix ? ` ${resource.suffix}` : "";

	return `${group.verb} ${amount} ${itemLabel}${suffix}.`;
};

const buildTask = (
	group: VerificationGroup,
	resource: VerificationResource,
	amount: number,
): VerificationTask => {
	const rawXp = resource.xpPerUnit * amount;
	const expectedXp = Math.round(rawXp);

	return {
		id: `${group.skill}_${resource.id}_${amount}`,
		skill: group.skill,
		expectedXp,
		instructions: formatInstruction(group, resource, amount),
		amount,
		resourceId: resource.id,
	};
};

const getGroupForSkill = (skill: VerificationSkill) =>
	VERIFICATION_GROUPS.find((group) => group.skill === skill);

export const getInstructionForChallenge = (
	skill: VerificationSkill,
	expectedXp: number,
	resourceId?: string,
	amount?: number,
): string | null => {
	const group = getGroupForSkill(skill);
	if (!group) {
		return null;
	}

	if (resourceId && amount) {
		const resource = group.resources.find((item) => item.id === resourceId);
		if (resource) {
			return formatInstruction(group, resource, amount);
		}
	}

	for (const resource of group.resources) {
		const counts = getCountOptions(resource);
		for (const count of counts) {
			if (Math.round(resource.xpPerUnit * count) === expectedXp) {
				return formatInstruction(group, resource, count);
			}
		}
	}

	return null;
};

export const getVerificationTasks = (
	skills: SkillSnapshots,
	taskCount = 2,
	rng: RandomSource = Math.random,
): VerificationTask[] => {
	const eligibleResources: ResourceOption[] = [];

	for (const group of VERIFICATION_GROUPS) {
		const level = getSkillLevel(skills, group.skill);
		if (level <= 0) {
			continue;
		}

		for (const resource of group.resources) {
			if (level >= resource.minLevel) {
				const counts = getCountOptions(resource);
				if (counts.length > 0) {
					eligibleResources.push({ group, resource, counts });
				}
			}
		}
	}

	if (eligibleResources.length === 0) {
		return [];
	}

	const tasks: VerificationTask[] = [];
	const used = new Set<string>();
	const maxAttempts = taskCount * 6;
	let attempts = 0;

	while (tasks.length < taskCount && attempts < maxAttempts) {
		attempts += 1;
		const selection = pickRandom(eligibleResources, rng);
		const amount = pickRandom(selection.counts, rng);
		const task = buildTask(selection.group, selection.resource, amount);

		if (!used.has(task.id) || eligibleResources.length === 1) {
			used.add(task.id);
			tasks.push(task);
		}
	}

	while (tasks.length < taskCount) {
		const fallback = eligibleResources[0];
		const amount = fallback.counts[0];
		tasks.push(buildTask(fallback.group, fallback.resource, amount));
	}

	return tasks;
};

export { getSkillXp };
