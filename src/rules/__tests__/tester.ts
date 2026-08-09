import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

/**
 * A tester that parses TypeScript.
 *
 * Every rule here is about declarations that do not exist in JavaScript —
 * interfaces, type aliases, enums — so the default parser would report them as
 * syntax errors and the cases that matter most could not be written at all.
 */
export const tester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2023,
    sourceType: 'module',
  },
});
