import type { Rule } from 'eslint';

import { readThresholds } from '../thresholds.js';

/**
 * Size Rule: a single file may not cross the project's ceiling.
 *
 * This is the guardrail that a generating model most needs and least imposes
 * on itself. Left unbounded it will produce one file holding types, helpers,
 * constants and a class, because nothing in the prompt told it to stop.
 *
 * Blank lines and comments are counted. A file that is long because it is
 * documented is still long to read, and excluding comments would reward
 * padding the very thing the documentation rule asks for.
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
    const { maxFileLines: max } = readThresholds(context.filename);

    return {
      Program(node) {
        const lines = context.sourceCode.lines.length;
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
