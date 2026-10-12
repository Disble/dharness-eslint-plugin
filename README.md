# dharness-eslint-plugin

The guardrails [dharness](https://github.com/Disble/dharness) enforces on
generated code, in the one place that can express them.

fallow bans names, not shapes. react-doctor ships 787 rules and none of these.
oxlint has neither `no-restricted-syntax` nor a jsdoc rule, so neither the size
of a file nor the presence of documentation can be stated as configuration.
These rules exist because that gap is real and measured, not because a wrapper
wanted rules of its own.

## Rules

| Rule | What it refuses |
| --- | --- |
| `dharness/max-file-lines` | A file past the project's ceiling |
| `dharness/require-jsdoc` | A top-level declaration with no JSDoc above it |
| `dharness/require-variable-jsdoc` | A top-level variable with no JSDoc immediately above it |
| `dharness/role-file-shape` | A role file declaring something its name does not promise — a `.types.ts` holding a function |
| `dharness/folder-ownership` | A module split into role files without moving into a folder of its own with an `index.ts` |
| `dharness/pure-index-barrel` | An `index.ts` that does anything but re-export from its siblings |

`require-jsdoc` and `require-variable-jsdoc` divide the file root between them —
variables belong to the second, everything else to the first — so no declaration
is ever reported twice.

`role-file-shape`, `folder-ownership` and `pure-index-barrel` guard their own
scope: they return early on files they do not judge. That is deliberate. Under
react-doctor a rule's configuration is a severity and nothing else, so a rule
that relies on a glob to be pointed at the right files would report every file
in the project.

## Thresholds

Numbers live in `.dharness/rules.json`, not in the rule:

```json
{
  "schema": "dharness.rules/v1",
  "maxFileLines": 500,
  "countComments": false,
  "countBlankLines": false,
  "roleSuffixes": [".types.ts", ".constants.ts", ".helpers.ts", ".schema.ts"]
}
```

They have to. react-doctor accepts only `error`, `warn` or `off` as a severity —
`["error", 500]` is rejected outright and `context.options` arrives empty — so a
rule cannot carry its own number. Reading a file means one project can differ
from another without publishing a new version of this package.

A missing or unreadable file falls back to the defaults. A linter that refuses
to start because one number could not be read stops every other rule with it.
Each field falls back on its own: a value that is not a JSON boolean leaves the
other fields alone instead of discarding them.

### What `maxFileLines` counts

By default a physical line counts only when it holds code. Two independent
booleans widen that:

| Line | Default | Counts when |
| --- | --- | --- |
| Code, with or without a trailing comment | counted once | always |
| Comment-only, whitespace aside | ignored | `countComments: true` |
| Empty or whitespace-only | ignored | `countBlankLines: true` |

Both default to `false`. An existing project keeps its ceiling, but not the
count it used to make: with the options absent, this plugin counts code only,
where the previous one counted every physical line. Upgrading can therefore
move a file across the line in one direction only — a documented file under the
ceiling stops being reported. A project that wants the previous total-line
policy opts back into it by setting both options to `true`.

The classification reads the parser's tokens and comments, not a search for
`//`. A comment marker inside a string, a template literal or a regex is text,
so the line holding it counts as code. A line holding code beside a trailing
comment is one line, counted once. A physically blank line is blank wherever it
sits — including inside a block comment or a multiline literal — so
`countBlankLines` decides it there too, and only then.

Worked boundary — a file with three code lines, two comment-only lines and one
blank line counts `3` by default, `5` with `countComments`, `4` with
`countBlankLines`, and `6` with both. `maxFileLines` is enforced against that
count: exactly that many counted lines pass and one more reports.

This rule is the enforcement (L1). Its counted-line behaviour is pinned by the
rule's own tests (L3). The permanent tarball gate (`bun run e2e:pack`) is an L6
check of packaging, not of this policy: it proves the built package still loads
and exports in both hosts, which is the entry-point drift it exists to catch.
The runtime proof for the counting policy is a disposable consumer matrix run
outside the repository, loading the packed plugin in a real ESLint CLI and
asserting the report and exit code for each flag. That matrix is evidence for a
change, not a check the repository keeps running.

`roleSuffixes` tells `folder-ownership` what counts as a split, so a project can
invent a role and have it recognised. It does not teach `role-file-shape` what
that role means — a suffix with no entry in its table is left alone rather than
guessed at.

## Two hosts

The same built file loads in both:

```jsonc
// eslint.config.js
import dharness from 'dharness-eslint-plugin';
export default [{ plugins: { dharness }, rules: { 'dharness/max-file-lines': 'error' } }];
```

```jsonc
// doctor.config.json
{ "plugins": ["dharness-eslint-plugin"], "rules": { "dharness/max-file-lines": "error" } }
```

react-doctor loads plugins with `require`, so the package ships a CommonJS entry
as well as an ESM one. Declaring only `import` is what stopped its predecessor
from loading at all.

## Credit

Several rules are adapted from
[dlinter-ts-react](https://github.com/Disble/dlinter-ts-react) (MIT), which this
package supersedes.
