import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		name: "backend",
		environment: "node",
		include: ["convex/**/*.test.ts"],
		exclude: ["convex/_generated/**", "node_modules", "dist"],
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
});
