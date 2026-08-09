import { folderOwnership } from './rules/folder-ownership.js';
import { maxFileLines } from './rules/max-file-lines.js';
import { pureIndexBarrel } from './rules/pure-index-barrel.js';
import { requireJsdoc } from './rules/require-jsdoc.js';
import { requireVariableJsdoc } from './rules/require-variable-jsdoc.js';
import { roleFileShape } from './rules/role-file-shape.js';

import type { Rule } from 'eslint';

/**
 * The plugin's name, which every rule id is scoped by.
 *
 * It comes from here and not from the package name: a rule declared as
 * `dharness/max-file-lines` resolves because this says `dharness`, whatever
 * the package on disk is called.
 */
export const meta = { name: 'dharness' } as const;

/** Every rule this plugin publishes. */
export const rules: Record<string, Rule.RuleModule> = {
  'folder-ownership': folderOwnership,
  'max-file-lines': maxFileLines,
  'pure-index-barrel': pureIndexBarrel,
  'require-jsdoc': requireJsdoc,
  'require-variable-jsdoc': requireVariableJsdoc,
  'role-file-shape': roleFileShape,
};

// `meta` and `rules` are also exported by name above, because react-doctor
// loads a plugin with `require` and reads them off the module object.
export default { meta, rules };
