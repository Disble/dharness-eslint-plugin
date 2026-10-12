# Configurable file-line counting

## Status and authority
Plugin implementation, independent functional verification and local behavior commit are complete. The user authorized local plugin closure after the dharness commits. Publishing remains separate.

- Target: `dharness-eslint-plugin`, branch `feat/configurable-file-line-count`.
- Base: `e11cf6736dd7ae4a9650f327d86d7df4fb8053ef`.
- Keep `.codegraph/` and unrelated `odd/` files untouched and unstaged.
- No push, PR, merge, publication, version bump, dependency or packaging-script change.
- Local package identity remains 0.2.1; it is not proof the registry contains these changes.
- Recovery: Engram project `dharness-eslint-plugin`, topic `odd/configurable-file-line-count/tasks`.

## Contract
- Keep schema `dharness.rules/v1` and ceiling `maxFileLines: 500`.
- Default strict independent booleans `countComments: false` and `countBlankLines: false`, including old configuration without the flags.
- Count code/comment overlap once. Nonblank code-token spans, including multiline literals, count as code; comment-only lines follow `countComments`.
- Physically blank/whitespace-only lines follow `countBlankLines`, even inside comments or multiline literals. Both flags true recover ESLint's total-source-line measure.
- Exactly N counted lines pass; N+1 reports. No test-file exemption or new-file-only restriction.
- Use parser tokens/comments, not regular-expression parsing. Missing token arrays degrade to counting nonblank lines as code rather than throwing.
- Invalid individual fields fall back independently. Missing/malformed/null/scalar/array documents fall back safely; nearest-project lookup and cache behavior remain intact.
- Keep six rules, ESM/CJS named/default exports, and severity-only rule configuration. Numbers and flags live in `.dharness/rules.json`, not `context.options`.

## Work units
- [x] T1: Close the implemented, independently verified plugin policy with its owning tests and README in local behavior commit `733bc1607de4c7f52306438ae579924eb1ffd9f2`.
- [x] T2: Generator integration and persistent configuration in dharness; owning tests, fixtures and docs committed there.
- [x] T3: Fresh combined consumer and actual binary gate verified; compatibility limits and release order documented without publishing.

| Unit | Scope | Commit |
| --- | --- | --- |
| Plugin T1 | `src/thresholds.ts`, `src/rules/max-file-lines.ts`, their two owning test files, `README.md` | `733bc1607de4c7f52306438ae579924eb1ffd9f2` |
| dharness R0 | Test snapshot whitespace and owning tests | `5105221` |
| dharness R1 | Threshold defaults/reader/normalization and owning contracts | `1b125b3` |
| dharness R2 | Dedicated sync owner, preservation/delegation and owning tests/docs | `5ade270` |
| dharness record | Work-unit and verification evidence | `15d0f52` |

Plugin behavior scope is five files, 535 additions plus 11 deletions = 546 diff lines, including the new loader test. This is one dependent counting/configuration policy with its behavior tests, not a user-imposed size limit. Its committed tree is `2b2e1fd6fac2020c8250f6fd9cf9d3ff64ad7fe1`; exact staged paths, canonical Git blobs and whitespace were checked before commit. Its passive recovery record is a separate documentation unit.

## Observed verification
- Initial policy RED: loader 7 failed/1 passed; rule 1 failed/3 passed before implementation. Correction RED: whole-document-null scenario failed with TypeError before the non-object guard.
- Final independent `bun run validate`: typecheck, build, self-lint and 43 tests across eight files passed. `MIXED_EXPORT` remains the existing build warning.
- Fresh Bun pack/install consumer: 128 exact CLI assertions, 67 expected exit 0 and 61 expected exit 1, zero exit 2. ESM/CJS named/default exports and six-rule inventory passed; severity-only max-file-lines schema stayed empty.
- Coverage includes all four flag combinations, small/default 500/501 boundaries, mixed comments/code, strings/regex/template markers, multiline comments/literals, blank-first precedence, CRLF, final newlines, shebang, JSX/TypeScript, test scope and documentation-heavy files.
- Whole-document null/true/number/string/array and missing/truncated documents default safely. Invalid boolean fields preserve valid sibling-field behavior.
- Independent current-candidate evidence: `consolidated-validation.json` in the retained scratch audit. At closure all five candidate SHA256s and every row of the 19-file source manifest still match exact current bytes; no code or README changed after these checks.
- Source manifest SHA256: `48469f93a726765ceda02450ad79d78c8403c418322f54c1185502e1e27c7869`.
- Fresh local pack SHA256: `67b7101717518fc8735eef98e949ae4e126b2fa1b54e10b4cf557dc121d2e971`.
- Joint generator/consumer checks passed defaults, explicit flags, repeat sync, old/malformed configuration and JS-effective high ceilings. The consumer reinstalled the exact local pack after sync could install registry 0.3.0.
- Actual scratch `dharness check` exited 1 for `dharness/max-file-lines`; output explicitly confirmed ESLint failure prevented react-doctor from running. The unborn fixture skipped Fallow, not a Fallow pass.
- Corrected joint audit SHA256: `7199899243684e6568274a3ff11ebd842514dc28b7fd56773a647e2beaffff73`; binary gate proof: `b3bac3a154f0fd4b7687cde4089cbb4a2583b65d6a404e385e0504b61e60d097`.

## Mutation and boundaries
- Ten manual variants were killed: strict boolean truthiness, default comments, blank-first literal, blank-first block comment, shared code/comment, comment opt-in, blank opt-in, multiline coverage, default 500 ceiling, and whole-document-null guard. Exact changed guards were restored without discarding the dirty feature.
- M10 exclusive-end guard survived; both parsers' observed JSX fixture supports equivalence there only, not a universal proof. Synthetic incomplete token arrays were not observed under a supported host.
- `mutation-tdd` was unavailable; manual repository protocol was used. There is no systematic mutation runner for this plugin surface; do not substitute the generator's mutation score.
- CommonJS loading is not proof that a host discovers the generated layer. Global react-doctor 0.2.1 and latest observed 0.9.17 did not adopt generated flat ESLint config; factory/static comparison did not isolate a factory defect.
- The user selected existing staged ESLint ownership, not a duplicate standalone react-doctor finding or a bridge/host upgrade. This supersedes the old unavailable-host closure blocker without relabeling failed adoption as passing.
- Canonical `bun run e2e:pack` was not admitted as a pass: the unchanged script invokes npm/npx. Fresh Bun equivalents proved pack/install/entry-point and rule behavior; earlier unqualified canonical-pass narration remains historical, not current evidence.
- No fresh test/host/install/mutation campaign was rerun merely to close commits. Exact-byte matching preserves the prior independent functional evidence; commit scope/whitespace and preservation checks remain required.
- `AGENTS.md` explicitly records no local pre-commit gate; CI is the gate. No hook was installed/bypassed and no actual-index suite pass is claimed for this repository. CI has not run for these local commits.
- RDD remains off (global); no review authority or switch mutation. Prior conservative independent verification is the record for the unchanged implementation.
- Cross-repository scout admission failed before launching work despite a valid Git target; no native Agent fallback was exposed. No alternate-cwd delegation bypass, transport fix, indefinite peer wait or human-message relay was used.

## Recovery and next step
The full former task narration is archived in local scratch history and Engram, not duplicated in the committed record. Unrelated untracked files were captured before closure for a final preservation comparison. T1 is closed by the behavior commit above. This passive record is a separate documentation unit; its own commit identity is recorded in Engram after the commit, avoiding a self-hash/amend cycle.

For delivery, release the compatible changed plugin before a generator release relying on these flags. Release-please owns versions; no released minimum or registry-compatible range is invented. Push, PR, merge and publication require separate user decisions.
