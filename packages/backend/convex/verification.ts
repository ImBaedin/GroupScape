"use node";

import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { getStatsByGamemode, type Stats } from "./osrsHiscores";
import {
	getSkillXp,
	getVerificationTasks,
	type SkillSnapshots,
} from "./verificationActions";

const verificationChallengeValidator = v.object({
	skill: v.string(),
	expectedXp: v.number(),
	baselineXp: v.number(),
	issuedAt: v.number(),
});

const buildSkillSnapshots = (stats: Stats): SkillSnapshots => ({
	woodcutting: {
		level: stats.skills.woodcutting.level,
		xp: stats.skills.woodcutting.xp,
	},
	fishing: {
		level: stats.skills.fishing.level,
		xp: stats.skills.fishing.xp,
	},
	cooking: {
		level: stats.skills.cooking.level,
		xp: stats.skills.cooking.xp,
	},
	fletching: {
		level: stats.skills.fletching.level,
		xp: stats.skills.fletching.xp,
	},
	runecraft: {
		level: stats.skills.runecraft.level,
		xp: stats.skills.runecraft.xp,
	},
});

export const start = action({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: v.object({
		instructions: v.string(),
		challenge: verificationChallengeValidator,
	}),
	handler: async (ctx, args) => {
		const account = await ctx.runQuery(
			anyApi.playerAccounts.getForVerification,
			{ accountId: args.accountId },
		);

		if (account.verificationStatus === "verified") {
			throw new ConvexError("Account already verified");
		}

		let stats: Stats;
		try {
			stats = await getStatsByGamemode(account.username);
		} catch {
			throw new ConvexError("Unable to fetch hiscores for that username");
		}

		const skillSnapshots = buildSkillSnapshots(stats);
		const tasks = getVerificationTasks(skillSnapshots, 1);

		if (tasks.length === 0) {
			throw new ConvexError(
				"No eligible verification tasks found for this account",
			);
		}

		const task = tasks[0];
		const challenge = {
			skill: task.skill,
			expectedXp: task.expectedXp,
			baselineXp: getSkillXp(skillSnapshots, task.skill),
			issuedAt: Date.now(),
		};

		await ctx.runMutation(anyApi.playerAccounts.setVerificationChallenge, {
			accountId: account._id,
			challenge,
		});

		return {
			instructions: task.instructions,
			challenge,
		};
	},
});
