import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { meta, rules } from '../plugin.js';

const readmePath = path.join(fileURLToPath(new URL('../../', import.meta.url)), 'README.md');

/**
 * The rule ids the README's rules table claims this package publishes.
 *
 * It reads the table rows rather than the whole document on purpose: the prose
 * and the config examples name individual rules too, and a rule mentioned in an
 * example is not a rule that has been documented.
 */
function documentedRuleIds(markdown: string): string[] {
  const rows = markdown.split('\n').filter((line) => line.startsWith('| `'));
  return rows.flatMap((row) => {
    const [, id] = /^\| `([^`]+)`/.exec(row) ?? [];
    return id === undefined ? [] : [id];
  });
}

/** The ids as the hosts resolve them — the plugin's `meta.name`, then the rule. */
function publishedRuleIds(): string[] {
  return Object.keys(rules).map((rule) => `${meta.name}/${rule}`);
}

describe('documentedRuleIds', () => {
  it('reads the ids out of the table rows', () => {
    const markdown = ['| Rule | What it refuses |', '| --- | --- |', '| `dharness/a` | Something |'].join('\n');

    expect(documentedRuleIds(markdown)).toEqual(['dharness/a']);
  });

  it('does not count a rule named in a config example as documented', () => {
    const markdown = "export default [{ rules: { 'dharness/a': 'error' } }];";

    expect(documentedRuleIds(markdown)).toEqual([]);
  });
});

describe('README', () => {
  // This is the check that was missing. The table was written when the package
  // published two rules and was never touched as four more landed, so it also
  // kept naming `dharness/require-exported-variable-jsdoc`, an id that resolves
  // to nothing in either host. Both directions are compared for that reason: a
  // rule with no row is undiscoverable, and a row with no rule is worse, because
  // someone copies it into a config that then silently lints nothing.
  it('documents every published rule, and only published rules', () => {
    const documented = documentedRuleIds(readFileSync(readmePath, 'utf8'));

    expect([...documented].sort()).toEqual([...publishedRuleIds()].sort());
  });
});
