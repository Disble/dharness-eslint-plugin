import { existsSync } from 'node:fs';
import path from 'node:path';

import { readThresholds } from '../thresholds.js';

import type { Rule } from 'eslint';

/**
 * Split Module Ownership Rule: once a module splits into role files
 * (`*.types.ts`, `*.helpers.ts` and the rest), the whole unit moves into a
 * folder named after it, with an `index.ts` as its entrypoint.
 *
 * Adapted from dlinter-ts-react (MIT), which this package supersedes. Its
 * suffix list was a constant; here it comes from `.dharness/rules.json`, so a
 * project that names its role files differently is still covered.
 *
 * The check reads the real filesystem rather than the import graph, because
 * the thing being judged is where files sit, and a role file nobody imports
 * yet is exactly the case worth catching.
 *
 * It guards its own scope — role files, entrypoints and declaration files
 * return early whatever globs point at it — so a config that aims it at every
 * file still behaves.
 */
export const folderOwnership: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require folder-owned entrypoints for modules split into role files',
    },
    messages: {
      flatSplitModule:
        'This module is split into role files but still sits flat. Move it and its {{siblings}} into a "{{stem}}" folder with an index.ts.',
      missingFolderIndex: 'This folder owns a split module and publishes no index.ts, so its role files are the API.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename;
        const baseName = path.basename(filename);
        const { roleSuffixes } = readThresholds(filename);

        if (
          !baseName.endsWith('.ts') ||
          baseName.endsWith('.d.ts') ||
          baseName === 'index.ts' ||
          roleSuffixes.some((suffix) => baseName.endsWith(suffix))
        ) {
          return;
        }

        const stem = baseName.slice(0, -'.ts'.length);
        const directory = path.dirname(filename);
        const siblings = roleSuffixes.filter((suffix) => existsSync(path.join(directory, `${stem}${suffix}`)));

        if (siblings.length === 0) return;

        if (path.basename(directory) !== stem) {
          context.report({
            node,
            messageId: 'flatSplitModule',
            data: { stem, siblings: siblings.join(', ') },
          });
          return;
        }

        if (!existsSync(path.join(directory, 'index.ts'))) {
          context.report({ node, messageId: 'missingFolderIndex' });
        }
      },
    };
  },
};
