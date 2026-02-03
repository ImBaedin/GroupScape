import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		partySizeLimit: v.number(),
	},
	returns: v.id("parties"),
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new ConvexError("Not authenticated");
		}

		// Get user by token identifier
		const user = await ctx.db
			.query("users")
			.filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
			.first();

		if (!user) {
			throw new ConvexError("User not found");
		}

		const now = Date.now();

		// Create the party
		const partyId = await ctx.db.insert("parties", {
			ownerId: user._id,
			members: [],
			name: args.name,
			description: args.description,
			partySizeLimit: args.partySizeLimit,
			status: "open",
			createdAt: now,
			updatedAt: now,
		});

		return partyId;
	},
});
