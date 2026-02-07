import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "osrs-content",
		environment: "node",
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		exclude: ["node_modules", "dist"],
	},
});
