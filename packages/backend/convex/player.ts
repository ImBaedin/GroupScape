import { v } from "convex/values";
import { getStatsByGamemode } from "osrs-json-hiscores";
import { action } from "./_generated/server";

export const getModelFromRuneProfile = action({
	args: {
		username: v.string(),
	},
	handler: async (ctx, args) => {
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
	handler: async (ctx, args) => {
		const hiscores = await getStatsByGamemode(args.username);

		return hiscores;
	},
});
