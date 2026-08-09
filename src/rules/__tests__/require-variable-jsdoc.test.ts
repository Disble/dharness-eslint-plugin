import { describe, it } from 'vitest';

import { requireVariableJsdoc } from '../require-variable-jsdoc.js';
import { tester } from './tester.js';

describe('require-variable-jsdoc', () => {
  it('asks for documentation on every variable at the top of a file', () => {
    tester.run('require-variable-jsdoc', requireVariableJsdoc, {
      valid: [
        { code: '/** Documented. */\nexport const value = 1;' },
        // Not exported and still documented: the reader who maintains this
        // file needs the internals explained more than the facade.
        { code: '/** Documented. */\nconst internal = 1;' },
        // Inside a function is not the top of a file.
        { code: 'function f() {\n  const local = 1;\n  return local;\n}' },
        // Functions and types belong to require-jsdoc, so neither rule
        // reports the same declaration twice.
        { code: 'export function documented() {}' },
      ],
      invalid: [
        { code: 'export const value = 1;', errors: [{ messageId: 'missingJsdoc' }] },
        { code: 'const internal = 1;', errors: [{ messageId: 'missingJsdoc' }] },
        // A line comment is not a JSDoc block. The rule asks for the form
        // tooling reads, not for the presence of some words.
        { code: '// not a block\nexport const value = 1;', errors: [{ messageId: 'missingJsdoc' }] },
      ],
    });
  });
});
