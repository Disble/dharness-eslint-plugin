# AGENTS.md

`dharness-eslint-plugin` publishes the six rules [dharness](https://github.com/Disble/dharness)
enforces on generated code. They exist because nothing else in that harness can
express them: fallow bans names rather than shapes, react-doctor ships 787 rules
and none of these, and oxlint has neither `no-restricted-syntax` nor a jsdoc
rule. A rule that another tool already covers does not belong here.

## Commands

    bun install --frozen-lockfile
    bun run validate      # typecheck + tests
    bun run build         # tsdown, emits CJS and ESM
    bun run e2e:pack      # packs the tarball and proves a consumer can load it

## Repo-owned rules with no equivalent below

**Two hosts, and the CommonJS one is not optional.** react-doctor loads a plugin
with `require` and ESLint with `import`, so the package ships both and exports
`meta` and `rules` by name as well as by default. Declaring only `import` is
exactly what stopped this package's predecessor from loading at all.

**Numbers live in `.dharness/rules.json`, never in a rule.** react-doctor accepts
only `error`, `warn` or `off` as a severity — `["error", 500]` is rejected
outright and `context.options` arrives empty. A rule that carried its own
threshold would have to be republished to change it in one project.

**A rule guards its own scope.** ESLint can point a rule at a glob and
react-doctor cannot, so a rule that depends on being scoped reports every file in
the project under the second host. Check the filename inside the rule.

**A missing or malformed thresholds file falls back to the defaults.** A linter
that refuses to start because one number could not be read stops every other rule
with it.

**`estree`'s types describe JavaScript.** Interfaces, type aliases and enums exist
only in the AST the TypeScript parser hands over, so a rule that reads them names
the shape it reads rather than casting to a type that says those nodes cannot
occur.

**The tarball gate is the regression net for entry-point drift.** An `exports`
map naming files the build does not emit resolves perfectly in this repository,
where the source sits right there, and fails only in a consumer that has nothing
but `dist`. That already happened once.

**Rules adapted from `dlinter-ts-react` (MIT) carry the attribution in the rule's
own doc comment**, along with what was changed and why. This package supersedes
it; copying without saying so would hide which decisions were inherited and
which were made here.

---

<!-- standards:v1.1.0 -->

## Engineering Principles

Twelve rules extracted from four repositories that arrived at the same thesis
independently: **a rule that only exists in prose does not exist.** Each one is
referenced by ID. To depart from one, write `deviates: Pnn — reason` in this
file's repo-owned section; silence is drift, a stated deviation is a decision.

### Governance of the rules themselves

**P01 — Every prose rule needs a machine owner.** If a convention cannot be
expressed as a lint rule, a test, or a gate job, it is a wish. Write the
enforcement first; prose explains the why behind it.

**P02 — Respect upstream triage, and lock it with a drift test.** A bundled
plugin's per-rule severities are its author's judgment. Override named rule IDs
only, each with a recorded reason. Then snapshot the plugin's error-set to a
contract test, so a version bump that re-triages a rule fails loudly instead of
shifting the gate in silence. Blanket-downgrading a ruleset throws away the exact
work the preset exists to do.

**P03 — Thresholds and exclusions carry their evidence inline.** Record the
measurement in the comment beside the number. An unexplained ignore entry is
indistinguishable from a shortcut, and gets deleted or copied for the wrong
reasons.

**P04 — Rank levers by gaming resistance.** Cognitive complexity has no escape by
relocation, so it is a strong lever. File size is defeated by sharding one file
into two, so it is never the headline. Know which rules actually hold.

**P05 — Baselines are debt with an expiry.** A baseline entry is an active
exception that must shrink and disappear. The healthy state of a baseline file is
empty. Treat a permanent entry as a permission slip that was never granted.

### Gates

**P06 — One entrypoint, and its verdict equals the cloud's.** A single hook
config with no shell orchestration around it, running what CI runs. A local
threshold looser than the cloud's makes local green a lie.

**P07 — Prove the gate's failure path.** Stage a deliberately broken file, run the
hook, assert it fails, clean up. A gate nobody has watched fail is unproven.

**P08 — Marker-comment ownership for generated config.** Anything a tool owns sits
behind a marker comment and is re-merged additively. Everything outside the
markers is repo-owned and survives every update.

### Tests

**P09 — Mutate, don't trust coverage.** RED → GREEN → MUTATE → REFACTOR. Delete
the guard a test claims to cover, run only that test, confirm it fails, restore.
A test that passes with its guard deleted proves nothing, and neither the suite
nor the coverage number will tell you. **Tests own behavior scenarios, never
mutants** — a suite written one test per surviving mutant mirrors the
implementation instead of the behavior it exists to protect. Strengthen the
scenario that already owns the outcome before adding a new test.

**P10 — State the boundary a guard does not cover.** Name what the check cannot
see, in the place someone will look. A guard whose limits are unstated will be
mistaken for a complete one. This applies to the harness as a whole: raising the
cost of a shortcut is worth shipping, and claiming it is impossible is not.

### Platform and knowledge

**P11 — Generators are platform, not convenience.** Never hand-scaffold what a
generator owns. A generator that emits structure the linter rejects is a platform
defect, never a user error.

**P12 — Keep an append-only why-log.** One dated line per non-obvious lesson,
newest at the bottom, never rewritten. A lesson that does not fit on one line has
not been extracted yet — that is an investigation, and it belongs in an ADR or a
postmortem with a one-line pointer from the log. The log complements deterministic
guards and never replaces them: enforce the rule in code first, record the why
second.

<!-- /standards -->

<!-- standards:ladder:v1.0.0 -->

## Enforcement Ladder

Every control in this repo sits on one of nine rungs. Each has a distinct owner
and a distinct failure mode. When adding a guard, name its rung first — two
guards on the same rung usually means one of them is redundant, and a rung with
nothing on it is where the next defect gets through.

| Rung | Control | Catches | Force |
|---|---|---|---|
| L0 | Agent doctrine — this file | The rule was never known | advisory |
| L1 | Architecture rails — lint rules, import contracts | Layer violations, misplaced declarations | blocking |
| L2 | Graph analysis — dead code, duplication, cycles, deps | Rot the compiler accepts | blocking |
| L3 | Test discipline — RED → GREEN → MUTATE → REFACTOR | Tests that pass with the guard deleted | prompt-driven |
| L4 | Local gate — one hook entrypoint | Everything above, before it enters history | blocking |
| L5 | Gate verification — prove the failure path | A gate that silently stopped enforcing | blocking |
| L6 | Cloud parity — CI, quality gate, drift contracts | Local green that is a lie | blocking |
| L7 | Agent-side gate — tool hook wrapping commit/push | An agent committing around the local gate | blocking |
| L8 | The why-record — ADRs, learning log | Rediscovering a solved problem | human process |

Two rules about the ladder itself:

**Advisory rungs stay advisory.** L0 and L8 carry judgment, and a gate that
blocks on documentation makes deleting the entry the cheapest way to commit —
which destroys the record it was meant to protect. Never promote them.

**L5 is the rung most often missing.** A gate nobody has watched fail is
indistinguishable from no gate at all.

<!-- /standards:ladder -->

<!-- standards:gate:v1.0.0 -->

## Gate Contract

**One entrypoint.** The hook config is the single place the local gate is
declared. No shell orchestration wrapped around it, no second script that runs
"the other checks". A reviewer asking "what blocks a commit here" reads one file.

**The local verdict equals the cloud's.** Any threshold looser locally than in
CI makes local green a lie, and the lie is discovered at the least convenient
moment. When a cloud gate flags something the local gate permits, tighten the
local one.

**The failure path is proven.** Stage a deliberately broken file, run the hook,
assert it fails, clean up. Keep that check runnable. A gate nobody has watched
fail is unproven, and gates fail silently far more often than they fire wrongly.

**The gate is slow by design — budget for it.** Give `git commit` a generous
command timeout so it is never killed mid-hook. A killed commit leaves changes
staged and unrecorded: re-run the commit. Never pass `--no-verify`.

**Suppressions are reviewable sentences.** Every inline suppression names the
specific rule and explains itself in prose. Silent suppression becomes a visible
diff a reviewer can catch.

**Weakening a threshold is a decision, not a fix.** Raising a limit or excluding
a path to make a finding disappear is the cheapest available action and almost
never the right one. If it is right, the reason goes in the config beside the
number.

<!-- /standards:gate -->

<!-- standards:threat:v1.0.0 -->

## What This Harness Does Not Guarantee

Every machine-checked rule here constrains code only while the rule stays in
place. A rule can be satisfied by removing it: widening a threshold, dropping a
linter from the enabled set, adding a suppression, excluding a path. Each is a
one-line change, cheaper than the refactor the rule was trying to force.

**A linter cannot police the config that configures it.** Any meta-check lives in
the same mutable tree, editable by the same actor with the same one-line change.
Shipping a partial mechanism here would imply a guarantee that cannot be made.

What this harness actually buys: defeating it is no longer free or silent. Every
threshold sits in one small reviewable file, and every suppression must name its
rule and explain itself in English. A reviewer checking whether anyone weakened
the cage has a short list of places to look.

The credible controls are external and belong to the repository's settings:
CODEOWNERS on the config files, branch protection requiring review, and a CI
check that fails a pull request when a threshold moves in the permissive
direction without a written justification.

**This raises the cost and visibility of cheating. It does not make cheating
impossible.** State the limit rather than decorating it — a guard whose
boundaries are unstated will be mistaken for a complete one.

<!-- /standards:threat -->

<!-- standards:mutation:manual:v1.1.0 -->

### Mutation (L3)

The cycle is RED → GREEN → **MUTATE** → REFACTOR. **Load the `mutation-tdd` skill
after a test goes green** — it owns the decision table and the survivor-triage
rules. This surface has no automated runner, so the MUTATE step is manual and
deliberately not a hook.

**The manual check.** Delete the guard the test claims to cover, run only that
test, confirm it FAILS, then restore with `git checkout -- <file>`. Run the single
test, never the suite — the suite is the wrong tool and the wrong cost.

Mandatory for concurrency and lock tests, defensive branches (nil guards, clamps,
fallbacks, early returns), error and timeout paths, and any test written to close
a coverage gap.

Branches the scheduler cannot reach need direct invocation of the unexported
function from an in-package test. A stress loop that never reaches the branch
passes while proving nothing.

**Report which guards you deleted and whether each survived.** A test that still
passes with its guard deleted proves nothing, and neither the suite nor the
coverage number will say so.

<!-- /standards:mutation:manual -->

---

## Deviations

Repo-owned. Silence is drift; a stated deviation is a decision.

- `deviates: profile:ts-react — not landed.` It names `dlinter-ts-react` via
  `createRecommendedConfig()`, which this package exists to supersede; `fallow
  audit`, which is not installed here; and React colocation rules for a package
  that contains no React. Landing it would point an agent at tooling this
  repository does not have.
- `deviates: L1, L2 — empty.` This package publishes lint rules and does not run
  any on itself: there is no `eslint.config.js` and no graph analysis. It is
  cheap to close by linting the package with its own rules, and worth doing.
- `deviates: L4, L5, P06, P07 — no local gate.` CI is the only gate. Unlike
  dharness, this repository has a package manager, so a hook manager here costs
  little.
- `deviates: L7 — empty.` No agent-side hook wraps commit or push.
- `deviates: P02 — no bundled ruleset to triage.` This package spreads no other
  plugin's config, so there is no upstream severity set to respect or snapshot.
  It is on the other side of that rule: what it publishes is what a consumer has
  to respect.
- `deviates: P05 — no baseline.` Nothing is baselined, so there is no debt to
  expire.

