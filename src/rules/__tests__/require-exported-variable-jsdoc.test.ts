import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { requireExportedVariableJsdoc } from '../require-exported-variable-jsdoc.js';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
});

describe('require-exported-variable-jsdoc', () => {
  it('asks for documentation on what leaves the module, and nothing else', () => {
    tester.run('require-exported-variable-jsdoc', requireExportedVariableJsdoc, {
      valid: [
        { code: '/** Documented. */\nexport const value = 1;' },
        // A line comment is not a JSDoc block, but neither is it nothing:
        // the rule asks for the form that tooling reads.
        { code: 'const internal = 1;' },
        // Functions and types are covered by jsdoc/require-jsdoc, whose
        // contexts do not include variables. This rule fills that hole only.
        { code: 'export function documented() {}' },
      ],
      invalid: [
        { code: 'export const value = 1;', errors: [{ messageId: 'missingJsdoc' }] },
        { code: '// not a block\nexport const value = 1;', errors: [{ messageId: 'missingJsdoc' }] },
      ],
    });
  });
});
