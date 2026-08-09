import type { Rule } from 'eslint';
import type { Node } from 'estree';

/**
 * Whether a declaration carries a JSDoc block immediately above it.
 *
 * `sourceCode.getJSDocComment` would answer this in one call and is not used:
 * it exists on the source object react-doctor hands a plugin and throws when
 * called, reported as not supported. Reading the preceding comment works in
 * both hosts, which is the point of this package.
 */
export function documented(sourceCode: Rule.RuleContext['sourceCode'], node: Node): boolean {
  const preceding = sourceCode.getCommentsBefore(node as never).at(-1);
  return preceding?.type === 'Block' && preceding.value.startsWith('*');
}

/**
 * The node a comment would sit above.
 *
 * A comment written above `export function f() {}` belongs to the export
 * statement, not to the function inside it, so asking about the inner
 * declaration finds nothing and every documented export reports as bare.
 */
export function commentAnchor(node: Rule.Node): Rule.Node {
  const parent = node.parent;
  if (parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportDefaultDeclaration') {
    return parent;
  }
  return node;
}

/** Whether a declaration sits at the top level of a file. */
export function atFileRoot(node: Rule.Node): boolean {
  return commentAnchor(node).parent?.type === 'Program';
}
