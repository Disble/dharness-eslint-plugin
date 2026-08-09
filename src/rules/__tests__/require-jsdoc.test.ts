import { describe, it } from 'vitest';

import { requireJsdoc } from '../require-jsdoc.js';
import { tester } from './tester.js';

describe('require-jsdoc', () => {
  it('covers every kind of declaration a file can open with', () => {
    tester.run('require-jsdoc', requireJsdoc, {
      valid: [
        { code: '/** Does a thing. */\nexport function f() {}' },
        { code: '/** A shape. */\ninterface Shape { a: number }' },
        { code: '/** An alias. */\nexport type Alias = string;' },
        { code: '/** A set of values. */\nenum Kind { A }' },
        { code: '/** A thing. */\nexport class Thing {}' },
        // Nested declarations are the body of something already documented.
        { code: '/** Outer. */\nexport function outer() {\n  function inner() {}\n  return inner;\n}' },
      ],
      invalid: [
        { code: 'export function f() {}', errors: [{ messageId: 'missingJsdoc' }] },
        { code: 'function f() {}', errors: [{ messageId: 'missingJsdoc' }] },
        { code: 'interface Shape { a: number }', errors: [{ messageId: 'missingJsdoc' }] },
        { code: 'export type Alias = string;', errors: [{ messageId: 'missingJsdoc' }] },
        { code: 'export class Thing {}', errors: [{ messageId: 'missingJsdoc' }] },
      ],
    });
  });

  // A comment written above an export belongs to the export statement, not to
  // the declaration inside it. Asking the inner node finds nothing, and every
  // documented export in the codebase reports as bare.
  it('reads the comment above the export, not above the declaration', () => {
    tester.run('require-jsdoc', requireJsdoc, {
      valid: [{ code: '/** Documented. */\nexport default function f() {}' }],
      invalid: [],
    });
  });
});
