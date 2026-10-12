import type { Rule } from 'eslint';

import { readThresholds } from '../thresholds.js';

/**
 * Size Rule: a single file may not cross the project's ceiling.
 *
 * This is the guardrail that a generating model most needs and least imposes
 * on itself. Left unbounded it will produce one file holding types, helpers,
 * constants and a class, because nothing in the prompt told it to stop.
 *
 * Blank lines and comments used to be counted. They are not by default: a file
 * that is long because it is documented and a file that is long because it
 * holds too much are different problems, and only the project knows which one
 * it has. A project may opt into either category independently, and the two
 * options together restore the old total-line measure.
 *
 * The classification reads the parser's token and comment spans rather than a
 * regular expression looking for `//`. A comment marker inside a string, a
 * template literal or a regex is text, not a comment, and guessing would
 * penalise the line for holding the exact content it was written to hold.
 */
export const maxFileLines: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'limit how many lines a single file may hold',
    },
    messages: {
      tooLong: 'This file has {{lines}} lines, over the {{max}} this project allows. Split it.',
    },
    schema: [],
  },
  create(context) {
    const { maxFileLines: max, countComments, countBlankLines } = readThresholds(context.filename);

    return {
      Program(node) {
        const lines = countedLines(context.sourceCode, countComments, countBlankLines);
        if (lines <= max) return;

        context.report({
          node,
          messageId: 'tooLong',
          data: { lines: String(lines), max: String(max) },
        });
      },
    };
  },
};

/** A 1-based line and 0-based column, as a parser reports a position. */
type Position = {
  readonly line: number;
  readonly column: number;
};

/**
 * Anything the parser gives a source location: a token or a comment.
 *
 * The shape is stated here rather than imported from `estree` because the two
 * arrays this rule reads disagree about it: a token has a location and a
 * comment's is optional. Naming the shape both satisfy describes what the
 * parser actually handed over instead of casting to a type that denies it.
 */
type Span = {
  readonly loc?: Readonly<{ readonly start: Position; readonly end: Position }> | null | undefined;
};

/**
 * The physical line numbers a set of parser spans actually covers.
 *
 * A span's end is exclusive. When it lands at column zero of the line after
 * its start, the span stopped on the previous line; counting the line it
 * points at would count a physical line the parser never reached.
 */
function coveredLineNumbers(spans: readonly Span[]): Set<number> {
  const covered = new Set<number>();

  for (const span of spans) {
    const location = span.loc;
    if (location === null || location === undefined) continue;

    const { start, end } = location;
    const last = end.column === 0 && end.line > start.line ? end.line - 1 : end.line;

    for (let line = start.line; line <= last; line += 1) covered.add(line);
  }

  return covered;
}

/** The number of physical lines the configured policy counts in a parsed file. */
function countedLines(
  sourceCode: Rule.RuleContext['sourceCode'],
  countComments: boolean,
  countBlankLines: boolean,
): number {
  const code = coveredLineNumbers(sourceCode.ast?.tokens ?? []);
  const comments = coveredLineNumbers(sourceCode.ast?.comments ?? []);

  return sourceCode.lines.reduce((total, line, index) => {
    const number = index + 1;

    // Blank wins over every span. A whitespace-only line inside a block
    // comment or a multiline literal is still a blank physical line, and a
    // project that opted out of blanks opted out of it wherever it sits.
    if (line.trim() === '') return total + (countBlankLines ? 1 : 0);

    // A line a token touches is code, even when the token is the interior of a
    // template literal or a string holding a comment marker. Code beside a
    // trailing comment is one physical line counted once, because the token
    // that decided it is there. A line nothing recognises still reads as code:
    // the conservative answer, never the one that hides a long file.
    if (code.has(number) || !comments.has(number)) return total + 1;

    return total + (countComments ? 1 : 0);
  }, 0);
}
