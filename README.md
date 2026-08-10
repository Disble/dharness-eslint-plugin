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
  "roleSuffixes": [".types.ts", ".constants.ts", ".helpers.ts", ".schema.ts"]
}
```

They have to. react-doctor accepts only `error`, `warn` or `off` as a severity —
`["error", 500]` is rejected outright and `context.options` arrives empty — so a
rule cannot carry its own number. Reading a file means one project can differ
from another without publishing a new version of this package.

A missing or unreadable file falls back to the defaults. A linter that refuses
to start because one number could not be read stops every other rule with it.

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
