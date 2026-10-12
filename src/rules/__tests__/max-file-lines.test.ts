import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { RuleTester } from 'eslint';
import { afterEach, describe, it } from 'vitest';

import { tester as tsTester } from './tester.js';
import { maxFileLines } from '../max-file-lines.js';
import { forgetThresholds } from '../../thresholds.js';

const tester = new RuleTester();

/** The subset of `.dharness/rules.json` these behaviour tests pin. */
type RulesFile = {
  maxFileLines?: number;
  countComments?: boolean;
  countBlankLines?: boolean;
};

/** Builds a project whose `.dharness/rules.json` holds the given policy. */
function projectWith(rules: RulesFile): string {
  const root = mkdtempSync(path.join(tmpdir(), 'dharness-rules-'));
  mkdirSync(path.join(root, '.dharness'), { recursive: true });
  writeFileSync(
    path.join(root, '.dharness', 'rules.json'),
    JSON.stringify({ schema: 'dharness.rules/v1', ...rules }),
  );
  return root;
}

/** Builds a project that only names a ceiling. */
function projectWithCeiling(maxFileLines: number): string {
  return projectWith({ maxFileLines });
}

function lines(count: number): string {
  return Array.from({ length: count }, (_, index) => `const line${index} = ${index};`).join('\n');
}

/**
 * One file run at its counted ceiling and one counted line lower.
 *
 * The pair is the boundary itself: passing at `counted` and reporting at
 * `counted - 1` proves the policy counted exactly that many lines, and the
 * reported number is the count the rule will name in a real project.
 */
function boundary(rules: RulesFile, code: string, counted: number) {
  const atCeiling = projectWith({ ...rules, maxFileLines: counted });
  const overCeiling = projectWith({ ...rules, maxFileLines: counted - 1 });

  return {
    valid: [{ code, filename: path.join(atCeiling, 'src', 'file.ts') }],
    invalid: [
      {
        code,
        filename: path.join(overCeiling, 'src', 'file.ts'),
        errors: [
          { messageId: 'tooLong', data: { lines: String(counted), max: String(counted - 1) } },
        ],
      },
    ],
  };
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

  it('keeps the default ceiling at exactly 500 counted lines', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'dharness-default-'));

    // No `.dharness/rules.json` anywhere above this file, so the defaults
    // decide: 500 counted lines pass and 501 reports.
    tester.run('max-file-lines', maxFileLines, {
      valid: [{ code: lines(500), filename: path.join(root, 'src', 'exactly.ts') }],
      invalid: [
        {
          code: lines(501),
          filename: path.join(root, 'src', 'over.ts'),
          errors: [{ messageId: 'tooLong', data: { lines: '501', max: '500' } }],
        },
      ],
    });
  });
});

describe('counting policy', () => {
  // Six physical lines, three of them code. The default counts only the code,
  // so a project capped at three accepts this and reports one line lower.
  const sparse = [
    '// a comment',
    '// another comment',
    'const a = 1;',
    '',
    'const b = 2;',
    'const c = 3;',
  ].join('\n');

  it('counts code only by default, skipping comments and blanks', () => {
    tester.run('max-file-lines', maxFileLines, boundary({}, sparse, 3));
  });

  it('counts comment-only lines only when the project opts in', () => {
    tester.run('max-file-lines', maxFileLines, boundary({ countComments: true }, sparse, 5));
  });

  it('counts blank lines only when the project opts in', () => {
    tester.run('max-file-lines', maxFileLines, boundary({ countBlankLines: true }, sparse, 4));
  });

  it('recovers the total-line measure when both options are on', () => {
    // The trailing empty entry is the line `sourceCode.lines` reports for a
    // file that ends in a newline, so six physical lines here, not five.
    const padded = `${sparse}\n`;

    tester.run(
      'max-file-lines',
      maxFileLines,
      boundary({ countComments: true, countBlankLines: true }, padded, 7),
    );
  });

  it('counts a line shared by code and a comment once', () => {
    const mixed = [
      'const a = 1; // trailing',
      '/* block */ const b = 2;',
      '/* block',
      '   ends */ const c = 3;',
    ].join('\n');

    tester.run('max-file-lines', maxFileLines, boundary({}, mixed, 3));
    tester.run('max-file-lines', maxFileLines, boundary({ countComments: true }, mixed, 4));
  });

  it('treats comment markers inside literals as the text they are', () => {
    const literals = [
      "const url = 'http://example.com'; // not a comment",
      'const pattern = /\\/\\//;',
      'const text = `// still text',
      '/* not a comment */`;',
    ].join('\n');

    tester.run('max-file-lines', maxFileLines, boundary({}, literals, 4));
    tester.run(
      'max-file-lines',
      maxFileLines,
      boundary({ countComments: true, countBlankLines: true }, literals, 4),
    );
  });

  it('applies the blank rule inside a multiline literal', () => {
    const literal = [
      'const text = `line one',
      '',
      'line three',
      '// text, not a comment',
      '`;',
    ].join('\n');

    tester.run('max-file-lines', maxFileLines, boundary({}, literal, 4));
    tester.run('max-file-lines', maxFileLines, boundary({ countComments: true }, literal, 4));
    tester.run('max-file-lines', maxFileLines, boundary({ countBlankLines: true }, literal, 5));
  });

  it('applies the blank rule inside a block comment', () => {
    const block = ['/*', 'line', '', 'end', '*/', 'const a = 1;', 'const b = 2;'].join('\n');

    tester.run('max-file-lines', maxFileLines, boundary({}, block, 2));
    tester.run('max-file-lines', maxFileLines, boundary({ countComments: true }, block, 6));
    tester.run('max-file-lines', maxFileLines, boundary({ countBlankLines: true }, block, 3));
    tester.run(
      'max-file-lines',
      maxFileLines,
      boundary({ countComments: true, countBlankLines: true }, block, 7),
    );
  });

  it('classifies TypeScript declarations with the same policy', () => {
    const typescript = [
      '// documented in a comment',
      'interface Shape {',
      '  readonly id: string;',
      '}',
      '',
      'type Alias = Shape;',
    ].join('\n');

    tsTester.run('max-file-lines', maxFileLines, boundary({}, typescript, 4));
    tsTester.run('max-file-lines', maxFileLines, boundary({ countComments: true }, typescript, 5));
  });

  it('counts the same across LF and CRLF line endings', () => {
    const lf = ['// header', '', 'const a = 1;', 'const b = 2;'].join('\n');
    const crlf = ['// header', '', 'const a = 1;', 'const b = 2;'].join('\r\n');

    tester.run('max-file-lines', maxFileLines, boundary({}, lf, 2));
    tester.run('max-file-lines', maxFileLines, boundary({}, crlf, 2));
    tester.run('max-file-lines', maxFileLines, boundary({ countBlankLines: true }, crlf, 3));
  });

  it('separates the trailing newline from a real blank line', () => {
    const trailing = `${lines(2)}\n`;

    tester.run('max-file-lines', maxFileLines, boundary({}, trailing, 2));
    tester.run('max-file-lines', maxFileLines, boundary({ countBlankLines: true }, trailing, 3));
  });

  it('holds .test filenames to the same whole-file count', () => {
    const testFile = [
      '// a comment a model would add',
      'import { describe, it } from \'vitest\';',
      '',
      "describe('thing', () => {",
      '  it(\'works\', () => {});',
      '});',
    ].join('\n');

    const atCeiling = projectWith({ maxFileLines: 4 });
    const overCeiling = projectWith({ maxFileLines: 3 });

    // No exemption for a test path: the filename changes nothing about what
    // the policy counts, and this is the file shape most likely to look long
    // while holding only four code lines.
    tester.run('max-file-lines', maxFileLines, {
      valid: [{ code: testFile, filename: path.join(atCeiling, 'src', 'thing.test.ts') }],
      invalid: [
        {
          code: testFile,
          filename: path.join(overCeiling, 'src', 'thing.test.ts'),
          errors: [{ messageId: 'tooLong', data: { lines: '4', max: '3' } }],
        },
      ],
    });
  });
});
