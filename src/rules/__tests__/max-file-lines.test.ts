import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { RuleTester } from 'eslint';
import { afterEach, describe, it } from 'vitest';

import { maxFileLines } from '../max-file-lines.js';
import { forgetThresholds } from '../../thresholds.js';

const tester = new RuleTester();

/** Builds a project whose `.dharness/rules.json` names a ceiling. */
function projectWithCeiling(maxFileLines: number): string {
  const root = mkdtempSync(path.join(tmpdir(), 'dharness-rules-'));
  mkdirSync(path.join(root, '.dharness'), { recursive: true });
  writeFileSync(
    path.join(root, '.dharness', 'rules.json'),
    JSON.stringify({ schema: 'dharness.rules/v1', maxFileLines }),
  );
  return root;
}

function lines(count: number): string {
  return Array.from({ length: count }, (_, index) => `const line${index} = ${index};`).join('\n');
}

afterEach(forgetThresholds);

describe('max-file-lines', () => {
  it('reads the ceiling from the project rather than from the rule', () => {
    const root = projectWithCeiling(4);

    tester.run('max-file-lines', maxFileLines, {
      valid: [{ code: lines(4), filename: path.join(root, 'src', 'small.ts') }],
      invalid: [
        {
          code: lines(9),
          filename: path.join(root, 'src', 'large.ts'),
          errors: [{ messageId: 'tooLong', data: { lines: '9', max: '4' } }],
        },
      ],
    });
  });

  it('falls back to the default when a project never decided', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'dharness-none-'));

    // 500 is the default, so a file under it passes with no file present.
    tester.run('max-file-lines', maxFileLines, {
      valid: [{ code: lines(200), filename: path.join(root, 'src', 'ordinary.ts') }],
      invalid: [],
    });
  });

  it('does not throw on a thresholds file it cannot read', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'dharness-broken-'));
    mkdirSync(path.join(root, '.dharness'), { recursive: true });
    writeFileSync(path.join(root, '.dharness', 'rules.json'), '{ truncated');

    // A linter that refuses to run because one number was unreadable stops
    // every other rule with it.
    tester.run('max-file-lines', maxFileLines, {
      valid: [{ code: lines(10), filename: path.join(root, 'src', 'ordinary.ts') }],
      invalid: [],
    });
  });
});
