import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { folderOwnership } from '../folder-ownership.js';
import { forgetThresholds } from '../../thresholds.js';
import { tester } from './tester.js';

/**
 * Builds a real directory, because the rule reads the real filesystem.
 *
 * That is deliberate in the rule: the thing being judged is where files sit,
 * and a role file nobody imports yet is exactly the case worth catching, so
 * the import graph could not answer it.
 */
function fixture(files: readonly string[]): string {
  const root = mkdtempSync(path.join(tmpdir(), 'dharness-'));
  for (const file of files) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, '');
  }
  forgetThresholds();
  return root;
}

describe('folder-ownership', () => {
  it('leaves a module with no role files alone', () => {
    const root = fixture(['src/user.ts']);

    tester.run('folder-ownership', folderOwnership, {
      valid: [{ filename: path.join(root, 'src/user.ts'), code: 'export const a = 1;' }],
      invalid: [],
    });
  });

  it('asks a flat split module to move into its own folder', () => {
    const root = fixture(['src/user.ts', 'src/user.types.ts']);

    tester.run('folder-ownership', folderOwnership, {
      valid: [],
      invalid: [
        {
          filename: path.join(root, 'src/user.ts'),
          code: 'export const a = 1;',
          errors: [{ messageId: 'flatSplitModule' }],
        },
      ],
    });
  });

  it('asks a folder-owned split module for an entrypoint', () => {
    const root = fixture(['src/user/user.ts', 'src/user/user.types.ts']);

    tester.run('folder-ownership', folderOwnership, {
      valid: [],
      invalid: [
        {
          filename: path.join(root, 'src/user/user.ts'),
          code: 'export const a = 1;',
          errors: [{ messageId: 'missingFolderIndex' }],
        },
      ],
    });
  });

  it('accepts a folder that owns its module and publishes an entrypoint', () => {
    const root = fixture(['src/user/user.ts', 'src/user/user.types.ts', 'src/user/index.ts']);

    tester.run('folder-ownership', folderOwnership, {
      valid: [{ filename: path.join(root, 'src/user/user.ts'), code: 'export const a = 1;' }],
      invalid: [],
    });
  });

  // The rule guards its own scope, so a config that aims it at every file
  // still behaves: a role file is not itself a split module.
  it('never reports the role files that caused the split', () => {
    const root = fixture(['src/user.ts', 'src/user.types.ts']);

    tester.run('folder-ownership', folderOwnership, {
      valid: [
        { filename: path.join(root, 'src/user.types.ts'), code: 'export type A = string;' },
        { filename: path.join(root, 'src/index.ts'), code: "export * from './user.js';" },
      ],
      invalid: [],
    });
  });

  // The suffix list comes from the project, not from this package, so a
  // project that names its role files differently is still covered.
  it('reads the suffix list the project configured', () => {
    const root = fixture(['.dharness/rules.json', 'src/user.ts', 'src/user.model.ts']);
    writeFileSync(path.join(root, '.dharness/rules.json'), JSON.stringify({ roleSuffixes: ['.model.ts'] }));
    forgetThresholds();

    tester.run('folder-ownership', folderOwnership, {
      valid: [],
      invalid: [
        {
          filename: path.join(root, 'src/user.ts'),
          code: 'export const a = 1;',
          errors: [{ messageId: 'flatSplitModule' }],
        },
      ],
    });

    expect(root).toBeTruthy();
  });
});
