import eslint from "@eslint/js";
import vitest from "eslint-plugin-vitest";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ["**/dist/**", "**/node_modules/**"],
	},
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: [
			"tests/**/*.ts",
			"packages/lastfm-scraper/tests/**/*.ts",
			"vitest.config.ts",
		],
		...vitest.configs.recommended,
		languageOptions: {
			globals: {
				...globals.node,
				...vitest.configs.env.languageOptions.globals,
			},
		},
	},
);
