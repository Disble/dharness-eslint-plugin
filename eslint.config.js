import tseslint from 'typescript-eslint';

import dharness from './dist/index.mjs';

/**
 * This package lints itself with the rules it publishes.
 *
 * A plugin whose own source does not survive its rules is either shipping
 * rules it does not believe or rules nobody has run. Building first is the
 * cost: the config imports `dist`, so `bun run build` has to come before it.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    // Tests are exempt. These rules exist to keep generated production code
    // readable; a documented fixture const and a barrel-shaped test directory
    // buy nothing, and the noise is what gets a whole config switched off.
    ignores: ['src/**/__tests__/**'],
    // tseslint.config does not choose a parser on its own, and without one
    // every TypeScript declaration reads as a syntax error.
    languageOptions: { parser: tseslint.parser },
    plugins: { dharness },
    rules: {
      'dharness/max-file-lines': 'error',
      'dharness/require-jsdoc': 'error',
      'dharness/require-variable-jsdoc': 'error',
      'dharness/role-file-shape': 'error',
      'dharness/folder-ownership': 'error',
      'dharness/pure-index-barrel': 'error',
    },
  },
);
