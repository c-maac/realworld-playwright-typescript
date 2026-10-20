import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig(
  // Ignore dependencies, build output, and generated Playwright files
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "test-results/",
      "playwright-report/",
    ],
  },

  // Base JavaScript and TypeScript rules
  js.configs.recommended,
  tseslint.configs.recommended,

  // Project-specific rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Likely bugs
      "eqeqeq": "error",
      "no-debugger": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // TypeScript quality
      "@typescript-eslint/no-explicit-any": "warn",

      // Small style preferences
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // Keep last: disables ESLint rules that conflict with Prettier
  eslintConfigPrettier
);