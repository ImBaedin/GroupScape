import type { Id } from "@GroupScape/backend/convex/_generated/dataModel";

export type VerificationStatus = "unverified" | "pending" | "verified";

export type VerificationChallenge = {
	skill: string;
	expectedXp: number;
	baselineXp: number;
	issuedAt: number;
	resourceId?: string;
	amount?: number;
};

export type VerificationResult = {
	status: "verified" | "pending" | "expired";
	deltaXp: number;
	expectedXp: number;
	remainingMs?: number;
};

export type VerificationState = {
	instructions?: string;
	challenge?: VerificationChallenge;
	result?: VerificationResult;
	isStarting?: boolean;
	isVerifying?: boolean;
	isCanceling?: boolean;
	error?: string;
};

export type VerificationStateByAccountId = Record<
	Id<"playerAccounts">,
	VerificationState
>;

export type CombatSkillKey =
	| "attack"
	| "strength"
	| "defence"
	| "hitpoints"
	| "ranged"
	| "magic"
	| "prayer";
