import path from 'node:path';

import type { Rule } from 'eslint';

/** Entrypoint names, since a barrel is not always written in TypeScript. */
const BARRELS = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mts', 'index.mjs'];

/**
 * Pure Barrel Contract: an `index.ts` only re-exports from sibling modules —
 * no local declarations, no imports, no side effects.
 *
 * Adapted from dlinter-ts-react (MIT), where the rule judged content and the
 * configuration owned scope, pointing it at `**\/index.ts`. Here it guards its
 * own scope instead, because it also runs under react-doctor, whose rule
 * configuration is a severity and nothing else. A rule that depends on being
 * scoped and is loaded by a host that cannot scope it reports every file in
 * the project.
 *
 * A barrel that declares its own values is the reason a "small refactor" turns
 * into a circular import: everything already imports the barrel, so whatever
 * lands in it is imported by everything.
 */
export const pureIndexBarrel: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'restrict barrel entrypoints to re-export statements only',
    },
    messages: {
      impureBarrel: 'A barrel only re-exports. This {{kind}} belongs in a module the barrel points at.',
    },
    schema: [],
  },
  create(context) {
    if (!BARRELS.includes(path.basename(context.filename))) return {};

    return {
      Program(node) {
        for (const statement of node.body) {
          if (isReExport(statement)) continue;

          context.report({
            node: statement,
            messageId: 'impureBarrel',
            data: { kind: describe(statement.type) },
          });
        }
      },
    };
  },
};

function isReExport(statement: { type: string; source?: unknown; declaration?: unknown }): boolean {
  if (statement.type === 'ExportAllDeclaration') return true;

  // `source` is what separates `export { a } from './a'` from `export { a }`,
  // which re-exports something the barrel had to import first.
  return statement.type === 'ExportNamedDeclaration' && statement.source != null && statement.declaration == null;
}

function describe(type: string): string {
  if (type === 'ImportDeclaration') return 'import';
  if (type === 'ExportNamedDeclaration' || type === 'ExportDefaultDeclaration') return 'local export';
  return 'statement';
}
