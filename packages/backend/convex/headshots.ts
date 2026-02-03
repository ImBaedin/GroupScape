"use node";

import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

const parseImageData = (imageData: string, contentType?: string) => {
	if (imageData.startsWith("data:")) {
		const match = imageData.match(/^data:([^;]+);base64,(.*)$/);
		if (!match) {
			throw new ConvexError("Invalid image data");
		}

		const parsedContentType = match[1];
		const base64Data = match[2];

		return { base64Data, contentType: parsedContentType };
	}

	if (!contentType) {
		throw new ConvexError("Image content type is required");
	}

	return { base64Data: imageData, contentType };
};

export const saveHeadshot = action({
	args: {
		accountId: v.id("playerAccounts"),
		imageData: v.string(),
		contentType: v.optional(v.string()),
	},
	returns: v.object({
		storageId: v.id("_storage"),
	}),
	handler: async (ctx, args) => {
		await ctx.runQuery(internal.playerAccounts.getForVerification, {
			accountId: args.accountId,
		});

		const { base64Data, contentType } = parseImageData(
			args.imageData,
			args.contentType,
		);

		if (!contentType.startsWith("image/")) {
			throw new ConvexError("Unsupported image type");
		}

		let buffer: Buffer;
		try {
			buffer = Buffer.from(base64Data, "base64");
		} catch (error) {
			throw new ConvexError("Invalid image encoding");
		}

		if (buffer.length === 0) {
			throw new ConvexError("Image data was empty");
		}

		const bytes = new Uint8Array(buffer);
		const blob = new Blob([bytes], { type: contentType });
		const storageId = await ctx.storage.store(blob);

		await ctx.runMutation(api.playerAccounts.setHeadshotStorageId, {
			accountId: args.accountId,
			storageId,
		});

		return { storageId };
	},
});
