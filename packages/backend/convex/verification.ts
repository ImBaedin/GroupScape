"use node";

import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { getStatsByGamemode, type Stats } from "./osrsHiscores";
import {
	getInstructionForChallenge,
	getSkillXp,
	getVerificationTasks,
	type SkillSnapshots,
	type VerificationSkill,
} from "./verificationActions";

const verificationChallengeValidator = v.object({
	skill: v.string(),
	expectedXp: v.number(),
	baselineXp: v.number(),
	issuedAt: v.number(),
	resourceId: v.optional(v.string()),
	amount: v.optional(v.number()),
});

const verificationResultValidator = v.object({
	status: v.union(
		v.literal("verified"),
		v.literal("pending"),
		v.literal("expired"),
	),
	deltaXp: v.number(),
	expectedXp: v.number(),
	remainingMs: v.optional(v.number()),
});

type VerificationResult = {
	status: "verified" | "pending" | "expired";
	deltaXp: number;
	expectedXp: number;
	remainingMs?: number;
};

const VERIFICATION_WINDOW_MS = 15 * 60 * 1000;

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

const getSkillXpFromStats = (stats: Stats, skill: VerificationSkill): number =>
	stats.skills[skill].xp;

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

		if (account.verificationStatus === "pending" && account.verificationChallenge) {
			const ageMs = Date.now() - account.verificationChallenge.issuedAt;
			if (ageMs < VERIFICATION_WINDOW_MS) {
				const instructions =
					getInstructionForChallenge(
						account.verificationChallenge.skill as VerificationSkill,
						account.verificationChallenge.expectedXp,
						account.verificationChallenge.resourceId,
						account.verificationChallenge.amount,
					) ??
					"Repeat the verification action you were given earlier.";

				return {
					instructions,
					challenge: account.verificationChallenge,
				};
			}
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
			resourceId: task.resourceId,
			amount: task.amount,
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

export const verify = action({
	args: {
		accountId: v.id("playerAccounts"),
	},
	returns: verificationResultValidator,
	handler: async (ctx, args): Promise<VerificationResult> => {
		const account = await ctx.runQuery(
			anyApi.playerAccounts.getForVerification,
			{ accountId: args.accountId },
		);

		if (account.verificationStatus === "verified") {
			throw new ConvexError("Account already verified");
		}

		const challenge = account.verificationChallenge;
		if (!challenge) {
			throw new ConvexError("No verification challenge found");
		}

		const now = Date.now();
		const expiresAt = challenge.issuedAt + VERIFICATION_WINDOW_MS;
		const remainingMs = Math.max(0, expiresAt - now);

		if (remainingMs === 0) {
			return {
				status: "expired",
				deltaXp: 0,
				expectedXp: challenge.expectedXp,
				remainingMs,
			};
		}

		let stats: Stats;
		try {
			stats = await getStatsByGamemode(account.username);
		} catch {
			throw new ConvexError("Unable to fetch hiscores for that username");
		}

		const currentXp = getSkillXpFromStats(
			stats,
			challenge.skill as VerificationSkill,
		);
		const deltaXp = currentXp - challenge.baselineXp;

		if (deltaXp >= challenge.expectedXp) {
			await ctx.runMutation(anyApi.playerAccounts.markVerified, {
				accountId: account._id,
				lastVerifiedAt: now,
			});

			return {
				status: "verified",
				deltaXp,
				expectedXp: challenge.expectedXp,
				remainingMs: 0,
			};
		}

		return {
			status: "pending",
			deltaXp,
			expectedXp: challenge.expectedXp,
			remainingMs,
		};
	},
});
