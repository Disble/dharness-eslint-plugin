import { describe, it } from 'vitest';

import { roleFileShape } from '../role-file-shape.js';
import { tester } from './tester.js';

describe('role-file-shape', () => {
  it('holds a role file to what its name promises', () => {
    tester.run('role-file-shape', roleFileShape, {
      valid: [
        { filename: 'user.types.ts', code: '/** A user. */\nexport interface User { id: string }' },
        { filename: 'user.types.ts', code: 'export type Id = string;' },
        { filename: 'user.constants.ts', code: "export const ROLE = 'admin';" },
        { filename: 'user.helpers.ts', code: 'export function format(u: string) { return u; }' },
        // A const holding an arrow function is a function by every measure
        // that matters here. Only the keyword differs.
        { filename: 'user.helpers.ts', code: 'export const format = (u: string) => u;' },
        // Imports and re-exports carry no declaration to judge.
        { filename: 'user.types.ts', code: "import type { Other } from './other.js';\nexport type Id = string;" },
        // A file with no role in its name is not this rule's business.
        { filename: 'user.ts', code: 'export class User {}' },
      ],
      invalid: [
        { filename: 'user.types.ts', code: 'export const DEFAULT = 1;', errors: [{ messageId: 'wrongShape' }] },
        { filename: 'user.types.ts', code: 'export function f() {}', errors: [{ messageId: 'wrongShape' }] },
        { filename: 'user.constants.ts', code: 'export function f() {}', errors: [{ messageId: 'wrongShape' }] },
        { filename: 'user.constants.ts', code: 'export class C {}', errors: [{ messageId: 'wrongShape' }] },
        // The strict one, and the point: constants have a file of their own,
        // and a helpers file that accumulates them is how the next
        // thousand-line module starts.
        { filename: 'user.helpers.ts', code: 'export const ROLE = 1;', errors: [{ messageId: 'wrongShape' }] },
      ],
    });
  });
});
