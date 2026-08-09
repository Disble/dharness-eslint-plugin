import type { Rule } from 'eslint';

import { atFileRoot, commentAnchor, documented } from './documented.js';

/**
 * Documentation Rule: every declaration at the top level of a file says what
 * it is for.
 *
 * The scope is the file's root rather than its exports on purpose. A model
 * asked to add a feature will happily leave a module of undocumented internal
 * helpers behind an exported facade, and the reader who inherits that file
 * needs the internals explained more than the facade.
 *
 * Variables are handled by `require-variable-jsdoc`, so the two never report
 * the same declaration twice.
 *
 * It exists because oxlint has no jsdoc rule at all, so this cannot be stated
 * as configuration anywhere in the harness.
 */
export const requireJsdoc: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require JSDoc on every declaration at the top level of a file',
    },
    messages: {
      missingJsdoc: 'This {{kind}} is declared at the top of the file with nothing saying what it is for.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function check(kind: string) {
      return (node: Rule.Node): void => {
        if (!atFileRoot(node)) return;
        if (documented(sourceCode, commentAnchor(node))) return;

        context.report({ node, messageId: 'missingJsdoc', data: { kind } });
      };
    }

    return {
      FunctionDeclaration: check('function'),
      ClassDeclaration: check('class'),
      TSInterfaceDeclaration: check('interface'),
      TSTypeAliasDeclaration: check('type'),
      TSEnumDeclaration: check('enum'),
      TSModuleDeclaration: check('module'),
    };
  },
};
