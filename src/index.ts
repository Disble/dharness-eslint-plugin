import type { Rule } from 'eslint';

import { maxFileLines } from './rules/max-file-lines.js';
import { requireExportedVariableJsdoc } from './rules/require-exported-variable-jsdoc.js';

export { DEFAULT_THRESHOLDS, forgetThresholds, readThresholds } from './thresholds.js';
export type { Thresholds } from './thresholds.js';

/**
 * What scopes every rule id.
 *
 * A rule configured as `dharness/max-file-lines` resolves because of this
 * field, not because of the package name. Verified by running it: react-doctor
 * loads the same object ESLint does and reads the prefix from here.
 */
export const meta = { name: 'dharness' } as const;

export const rules: Record<string, Rule.RuleModule> = {
  'max-file-lines': maxFileLines,
  'require-exported-variable-jsdoc': requireExportedVariableJsdoc,
};

/**
 * The plugin.
 *
 * `meta` and `rules` are also exported by name so a CommonJS `require` of this
 * package answers with them directly. react-doctor loads plugins that way, and
 * a package that only offers a default export would arrive as an object with
 * one useless key.
 */
export default { meta, rules };
