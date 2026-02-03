import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		contentName: v.string(),
		partySizeLimit: v.number(),
		filters: v.array(
			v.union([
				v.object({
					type: v.literal("killCount"),
					value: v.number(),
				}),
				v.object({
					type: v.literal("totalLevel"),
					value: v.number(),
				}),
				v.object({
					type: v.literal("combatLevel"),
					value: v.number(),
				}),
				v.object({
					type: v.literal("specificLevel"),
					skill: v.string(),
					value: v.number(),
				}),
			]),
		),
		scheduledTime: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error("Not authenticated");
		}

		// Get user by token identifier
		const user = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
			.first();

		if (!user) {
			throw new Error("User not found");
		}

		// Create the party
		const partyId = await ctx.db.insert("parties", {
			ownerId: user._id,
			members: [],
			name: args.name,
			description: args.description,
			contentName: args.contentName,
			partySizeLimit: args.partySizeLimit,
			filters: args.filters,
			scheduledTime: args.scheduledTime,
		});

		return partyId;
	},
});

