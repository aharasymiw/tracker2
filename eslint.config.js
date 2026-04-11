// @ts-check
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      'ops/migrations/**',
      'packages/game-content/src/**/*.json',
      '**/.vite/**',
      'apps/client/public/**',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2023,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // game-core and game-rng must be deterministic: no wall-clock, no native RNG, no I/O
  {
    files: ['packages/game-core/**/*.ts', 'packages/game-rng/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Math', message: 'Use the seeded PRNG from @lod/game-rng instead of Math.random. Math.floor/abs/etc. are fine — access them via a local helper if needed, not via the Math global.' },
        { name: 'Date', message: 'game-core must not reference wall-clock Date; receive time as a tick number.' },
        { name: 'performance', message: 'game-core must not reference performance; stay deterministic.' },
        { name: 'process', message: 'game-core must not reference process; no I/O allowed.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Use the seeded PRNG from @lod/game-rng instead of Math.random.',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'game-core must not reference Date; receive time as a tick number.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'game-core must not reference Date.now; receive time as a tick number.',
        },
      ],
    },
  },

  // Browser env for client
  {
    files: ['apps/client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  prettierConfig,
);
