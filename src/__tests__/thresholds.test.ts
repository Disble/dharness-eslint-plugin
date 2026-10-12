import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { forgetThresholds, readThresholds } from '../thresholds.js';

/**
 * Builds a project directory holding a `.dharness/rules.json` with the given
 * contents, and returns the directory. The file is written raw so a test can
 * hand over something malformed on purpose.
 */
function projectWith(rulesJson: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'dharness-thresholds-'));
  mkdirSync(path.join(root, '.dharness'), { recursive: true });
  writeFileSync(path.join(root, '.dharness', 'rules.json'), rulesJson);
  return root;
}

/** Reads the thresholds that apply to a source file inside a project root. */
function thresholdsFor(root: string, file = 'src/example.ts') {
  return readThresholds(path.join(root, file));
}

afterEach(forgetThresholds);

describe('counting options', () => {
  it('defaults to counting code only when a project never decided', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'dharness-thresholds-none-'));

    const thresholds = thresholdsFor(root);

    expect(thresholds.maxFileLines).toBe(500);
    expect(thresholds.countComments).toBe(false);
    expect(thresholds.countBlankLines).toBe(false);
  });

  it('reads a JSON boolean for each option independently', () => {
    const root = projectWith(
      JSON.stringify({
        schema: 'dharness.rules/v1',
        maxFileLines: 42,
        countComments: true,
        countBlankLines: true,
      }),
    );

    expect(thresholdsFor(root)).toMatchObject({
      maxFileLines: 42,
      countComments: true,
      countBlankLines: true,
    });
  });

  it('keeps one option when the other is missing or invalid', () => {
    const root = projectWith(
      JSON.stringify({ maxFileLines: 42, countComments: 'true', countBlankLines: 1 }),
    );

    // A string "true" is not a JSON boolean, and a linter must not let
    // JavaScript truthiness decide a policy the document states explicitly.
    expect(thresholdsFor(root)).toMatchObject({
      maxFileLines: 42,
      countComments: false,
      countBlankLines: false,
    });
  });

  it('treats null and absent options as the default without dropping valid siblings', () => {
    const root = projectWith(
      JSON.stringify({
        maxFileLines: 42,
        countComments: null,
        roleSuffixes: ['.types.ts'],
      }),
    );

    const thresholds = thresholdsFor(root);

    expect(thresholds.maxFileLines).toBe(42);
    expect(thresholds.countComments).toBe(false);
    expect(thresholds.countBlankLines).toBe(false);
    expect(thresholds.roleSuffixes).toEqual(['.types.ts']);
  });

  it('falls back only the malformed field', () => {
    const root = projectWith(
      JSON.stringify({ maxFileLines: -1, countComments: true, countBlankLines: false }),
    );

    const thresholds = thresholdsFor(root);

    expect(thresholds.maxFileLines).toBe(500);
    expect(thresholds.countComments).toBe(true);
    expect(thresholds.countBlankLines).toBe(false);
  });
});

describe('project lookup', () => {
  it('uses the nearest project rather than an ancestor', () => {
    const outer = projectWith(JSON.stringify({ maxFileLines: 100 }));
    const inner = path.join(outer, 'packages', 'app');
    mkdirSync(path.join(inner, '.dharness'), { recursive: true });
    writeFileSync(
      path.join(inner, '.dharness', 'rules.json'),
      JSON.stringify({ maxFileLines: 7, countComments: true }),
    );

    const thresholds = thresholdsFor(inner, 'packages/app/src/deep/file.ts');

    expect(thresholds.maxFileLines).toBe(7);
    expect(thresholds.countComments).toBe(true);
  });

  it('caches per project until it is told to forget', () => {
    const root = projectWith(JSON.stringify({ maxFileLines: 10 }));

    expect(thresholdsFor(root).maxFileLines).toBe(10);

    writeFileSync(path.join(root, '.dharness', 'rules.json'), JSON.stringify({ maxFileLines: 20 }));
    expect(thresholdsFor(root).maxFileLines).toBe(10);

    forgetThresholds();
    expect(thresholdsFor(root).maxFileLines).toBe(20);
  });

  it('does not throw on a malformed file', () => {
    const root = projectWith('{ truncated');

    expect(thresholdsFor(root)).toMatchObject({
      maxFileLines: 500,
      countComments: false,
      countBlankLines: false,
    });
  });
});

describe('document shape', () => {
  it('falls back to the defaults when the document is not a JSON object', () => {
    const root = projectWith('null');

    // `JSON.parse('null')` succeeds and hands back null, so reading a field
    // from it used to throw out of readThresholds and abort the lint run with
    // an exit code instead of a rule report.
    expect(thresholdsFor(root)).toMatchObject({
      maxFileLines: 500,
      countComments: false,
      countBlankLines: false,
    });
  });

  it.each(['true', '42', '"dharness"', '[]'])('treats %s as no decision', (document) => {
    const root = projectWith(document);

    expect(thresholdsFor(root)).toMatchObject({
      maxFileLines: 500,
      countComments: false,
      countBlankLines: false,
    });
  });
});
