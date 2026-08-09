import type { Rule } from 'eslint';

/**
 * Documentation Contract Rule: every exported variable declaration carries an
 * immediately preceding JSDoc block. Complements `jsdoc/require-jsdoc`, whose
 * contexts cover functions, interfaces, and type aliases but not variables.
 *
 * Adapted from dlinter-ts-react (MIT), which this package supersedes.
 *
 * `sourceCode.getJSDocComment` is deliberately not used: it exists on the
 * source object that react-doctor hands a plugin and throws when called,
 * reported as not supported. Reading the preceding comment works in both hosts.
 */
export const requireExportedVariableJsdoc: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require JSDoc immediately before exported variable declarations',
    },
    messages: {
      missingJsdoc: 'Exported variables must have an immediately preceding JSDoc block.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration?.type !== 'VariableDeclaration') return;

        const preceding = sourceCode.getCommentsBefore(node).at(-1);
        const documented = preceding?.type === 'Block' && preceding.value.startsWith('*');

        if (!documented) context.report({ node, messageId: 'missingJsdoc' });
      },
    };
  },
};
