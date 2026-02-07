import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			"./packages/runelite-party-client/vitest.config.ts",
			"./packages/osrs-content/vitest.config.ts",
			"./packages/backend/vitest.config.ts",
			"./apps/web/vitest.config.ts",
		],
	},
});
