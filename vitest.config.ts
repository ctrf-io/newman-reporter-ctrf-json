import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["tests/**/*.test.ts"],
		reporters: ["default", "./tests/reporters/vitest.mjs"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "lcov"],
			include: ["src/**/*.ts"],
			exclude: ["dist/**", "coverage/**", "ctrf/**", "node_modules/**"],
		},
	},
});
