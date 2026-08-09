import type { Rule } from 'eslint';

import { atFileRoot, commentAnchor, documented } from './documented.js';

/**
 * Documentation Contract Rule: every variable declared at the top level of a
 * file carries an immediately preceding JSDoc block.
 *
 * Adapted from dlinter-ts-react (MIT), which this package supersedes, and
 * widened from its exports to the whole file root: a module-level constant is
 * read by whoever maintains the file whether or not it leaves it, and a table
 * of magic values is exactly the kind of thing that needs a sentence.
 *
 * Function and type declarations belong to `require-jsdoc`, so the two never
 * report the same declaration twice.
 */
export const requireVariableJsdoc: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require JSDoc immediately before top-level variable declarations',
    },
    messages: {
      missingJsdoc: 'This variable is declared at the top of the file with nothing saying what it is for.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      VariableDeclaration(node) {
        if (!atFileRoot(node)) return;
        if (documented(sourceCode, commentAnchor(node))) return;

        context.report({ node, messageId: 'missingJsdoc' });
      },
    };
  },
};
