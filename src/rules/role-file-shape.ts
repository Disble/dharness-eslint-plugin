import path from 'node:path';

import type { Rule } from 'eslint';

/**
 * The shape this rule reads off the tree.
 *
 * `estree`'s own `Node` describes JavaScript, and the declarations that matter
 * most here — interfaces, type aliases, enums — exist only in the TypeScript
 * AST the parser actually hands over. Naming the few fields being read is more
 * honest than casting to a type that says these nodes cannot occur.
 */
type Declaration = {
  readonly type: string;
  readonly declaration?: Declaration | null;
  readonly declarations?: readonly { readonly init?: { readonly type: string } | null }[];
};

/**
 * What each role file is allowed to declare.
 *
 * The table is fixed rather than read from `.dharness/rules.json`, unlike the
 * suffix list `folder-ownership` uses. A project can invent a role and have it
 * count as a split; it cannot teach this rule what the new role means, and a
 * suffix with no entry here is left alone rather than guessed at.
 */
const SHAPES: Readonly<Record<string, readonly Kind[]>> = {
  '.types.ts': ['type'],
  '.constants.ts': ['type', 'value'],
  '.schema.ts': ['type', 'value'],
  '.helpers.ts': ['type', 'function'],
};

/** What a top-level declaration turns out to be, once its export wrapper is off. */
type Kind = 'type' | 'value' | 'function' | 'class';

/**
 * Role File Shape Rule: a file that claims a role in its name declares only
 * what that role names — a `.types.ts` declares types, a `.constants.ts`
 * declares constants, a `.helpers.ts` declares functions.
 *
 * Without it a split is cosmetic. A model asked to keep files small will
 * happily rename half of one into `foo.helpers.ts` and leave the state, the
 * constants and a class in it, which passes every other rule here: the line
 * count drops, the folder is owned, the barrel is pure, and nothing about the
 * code got easier to find.
 *
 * `.helpers.ts` refusing a plain constant is the strict part, and it is the
 * point: constants have a file of their own, and a helpers file that
 * accumulates them is how the next thousand-line module starts.
 */
export const roleFileShape: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'restrict a role file to the declarations its name promises',
    },
    messages: {
      wrongShape: 'A {{role}} file declares {{allowed}}. This is a {{kind}}, so it belongs in a sibling file.',
    },
    schema: [],
  },
  create(context) {
    const role = Object.keys(SHAPES).find((suffix) => context.filename.endsWith(suffix));
    if (role === undefined) return {};

    const allowed = SHAPES[role] as readonly Kind[];

    return {
      Program(program) {
        for (const statement of program.body as unknown as Declaration[]) {
          const kind = classify(unwrap(statement));
          if (kind === undefined || allowed.includes(kind)) continue;

          context.report({
            node: statement as never,
            messageId: 'wrongShape',
            data: {
              role: path.basename(role, '.ts'),
              allowed: readable(allowed),
              kind,
            },
          });
        }
      },
    };
  },
};

/**
 * The declaration inside an export, if there is one.
 *
 * Classifying the export statement itself would make every declaration in a
 * role file look the same, which is the whole thing being distinguished.
 */
function unwrap(statement: Declaration): Declaration {
  const isExport = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration';
  return isExport && statement.declaration != null ? statement.declaration : statement;
}

/** Undefined means the statement carries no declaration to judge. */
function classify(node: Declaration): Kind | undefined {
  switch (node.type) {
    case 'TSInterfaceDeclaration':
    case 'TSTypeAliasDeclaration':
    case 'TSEnumDeclaration':
    case 'TSDeclareFunction':
      return 'type';
    case 'ClassDeclaration':
      return 'class';
    case 'FunctionDeclaration':
      return 'function';
    case 'VariableDeclaration':
      // A const holding an arrow function is a function by every measure that
      // matters here; only the keyword differs.
      return (node.declarations ?? []).every((declarator) => isFunction(declarator.init)) ? 'function' : 'value';
    default:
      return undefined;
  }
}

/** A const holding an arrow function is a function; only the keyword differs. */
function isFunction(init: { readonly type: string } | null | undefined): boolean {
  return init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression';
}

/** Renders the allowed kinds as the sentence the message needs. */
function readable(kinds: readonly Kind[]): string {
  const named = kinds.map((kind) => (kind === 'type' ? 'types' : `${kind}s`));
  if (named.length === 1) return named[0] as string;
  return `${named.slice(0, -1).join(', ')} and ${named.at(-1) as string}`;
}
