import { describe, it } from 'vitest';

import { pureIndexBarrel } from '../pure-index-barrel.js';
import { tester } from './tester.js';

describe('pure-index-barrel', () => {
  it('allows a barrel to re-export and nothing else', () => {
    tester.run('pure-index-barrel', pureIndexBarrel, {
      valid: [
        { filename: 'index.ts', code: "export * from './a.js';" },
        { filename: 'index.ts', code: "export { a } from './a.js';" },
        { filename: 'index.ts', code: "export type { A } from './a.js';" },
        { filename: 'index.ts', code: "export * as ns from './a.js';" },
        { filename: 'index.ts', code: '' },
        // Any other file is not a barrel, whatever the configuration points
        // this rule at. react-doctor's rule config is a severity and nothing
        // else, so the rule cannot rely on being scoped.
        { filename: 'user.ts', code: 'export const value = 1;' },
      ],
      invalid: [
        // Without a source this re-exports something the barrel imported
        // first, which is the import it was supposed not to have.
        {
          filename: 'index.ts',
          code: "import { a } from './a.js';\nexport { a };",
          errors: [{ messageId: 'impureBarrel' }, { messageId: 'impureBarrel' }],
        },
        { filename: 'index.ts', code: 'export const value = 1;', errors: [{ messageId: 'impureBarrel' }] },
        { filename: 'index.ts', code: "import './side-effect.js';", errors: [{ messageId: 'impureBarrel' }] },
      ],
    });
  });
});
