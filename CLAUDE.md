# CLAUDE.md

Project-specific guidance for Claude Code. `AGENTS.md` is the canonical context —
the engineering doctrine, the enforcement ladder, and this repository's recorded
deviations. Read it first. This file names the two things that go wrong here.

## The rule that is easiest to violate

**A new rule has to earn its place against three tools that already exist.**

react-doctor ships 787 rules, fallow owns the repository graph, and oxlint covers
most of the core set. A rule belongs here only when none of them can express it —
which is why there are six and not sixty. Before adding one, say which existing
tool was checked and what it could not state.

The three that justified this package: file size, documentation on declarations,
and the shape of a role file. None can be written as configuration anywhere else.

## The second one

**Both hosts, or it does not ship.** react-doctor loads a plugin with `require`
and ESLint with `import`. The package emits CJS and ESM and exports `meta` and
`rules` by name as well as by default, and `bun run e2e:pack` proves a real
consumer can load the real tarball through both paths.

That gate is not ceremony. An `exports` map naming files the build does not emit
resolves perfectly here, where the source sits right there, and fails only in a
consumer that has nothing but `dist`. It has already happened once.

## Where the numbers live

`.dharness/rules.json`, never in a rule. react-doctor accepts only `error`,
`warn` or `off` as a severity, so `["error", 500]` is rejected and
`context.options` arrives empty. A missing or malformed file falls back to the
defaults rather than throwing: a linter that will not start because one number
could not be read stops every other rule with it.

## Commands

    bun install --frozen-lockfile
    bun run validate      # typecheck + tests
    bun run build         # tsdown, emits CJS and ESM
    bun run e2e:pack      # packs the tarball and proves a consumer can load it

Releases are cut by release-please and published from CI over OIDC. Do not
publish by hand.
