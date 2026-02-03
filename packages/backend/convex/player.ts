"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getStatsByGamemode } from "./osrsHiscores";

export const getModelFromRuneProfile = action({
	args: {
		username: v.string(),
	},
	handler: async (_ctx, args) => {
		const res = await fetch(
			`https://api.runeprofile.com/profiles/models/${args.username}?pet=true`,
		);
		const data = await res.json();
		return data as { playerModelBase64: string; petModelBase64: string };
	},
});

export const getHiscores = action({
	args: {
		username: v.string(),
	},
	handler: async (_ctx, args) => {
		const hiscores = await getStatsByGamemode(args.username);

		return hiscores;
	},
});
