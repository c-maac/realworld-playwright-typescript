import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    // Ignore build outputs and external dependencies
    {
        ignores: ['dist/', 'node_modules/', 'coverage/', 'build/'],
    },

    // Base JS & TS Rules
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // Custom project rules
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parserOptions: {
                project: true, // Enables type-aware linting via your tsconfig.json
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },

    // Disable formatting rules conflicting with Prettier
    eslintConfigPrettier
);