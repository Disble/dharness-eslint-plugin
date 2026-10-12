import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Where dharness writes the numbers these rules read. */
const THRESHOLDS_FILE = path.join('.dharness', 'rules.json');

/** How far up the tree to look before giving up on finding a project root. */
const MAX_ASCENT = 24;

/**
 * The numbers a rule cannot carry itself.
 *
 * react-doctor accepts only `error`, `warn` or `off` as a severity: passing
 * `["error", 500]` is rejected outright and `context.options` arrives empty.
 * Without a file the ceiling would be compiled into this package, and changing
 * it for one project would mean publishing a new version of it.
 */
export type Thresholds = {
  readonly maxFileLines: number;
  readonly roleSuffixes: readonly string[];
  readonly countComments: boolean;
  readonly countBlankLines: boolean;
};

/** What a project gets before it decides otherwise. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  maxFileLines: 500,
  roleSuffixes: ['.types.ts', '.constants.ts', '.helpers.ts', '.schema.ts'],
  countComments: false,
  countBlankLines: false,
};

/**
 * The file as it arrives: every field unknown, because it was written by hand.
 *
 * Typing it as `Thresholds` would assert that whatever is on disk already has
 * the right shape, which is the one thing that cannot be assumed here.
 */
type ThresholdsFile = {
  readonly maxFileLines?: unknown;
  readonly roleSuffixes?: unknown;
  readonly countComments?: unknown;
  readonly countBlankLines?: unknown;
};

/**
 * One entry per project root.
 *
 * A lint run touches every file in a project and would otherwise read and
 * parse the same file once per file. Keyed by root rather than globally so a
 * monorepo still gets one answer per package.
 */
const cache = new Map<string, Thresholds>();

/**
 * Reads the thresholds that apply to a file.
 *
 * The lookup walks up from the file rather than from the working directory,
 * because a linter is routinely invoked from somewhere else — an editor, a
 * monorepo root, a git hook — and the answer has to depend on which project
 * the file belongs to, not on where the process happened to start.
 *
 * A missing file means the defaults, never an error: a project that never
 * decided is not a project that is broken.
 */
export function readThresholds(fromFile: string): Thresholds {
  const root = findRoot(fromFile);
  if (root === undefined) return DEFAULT_THRESHOLDS;

  const cached = cache.get(root);
  if (cached !== undefined) return cached;

  const resolved = parse(path.join(root, THRESHOLDS_FILE));
  cache.set(root, resolved);
  return resolved;
}

/** Forgets what was read, so a test can change the file between cases. */
export function forgetThresholds(): void {
  cache.clear();
}

/** Walks up from a file until a thresholds file appears, or gives up. */
function findRoot(fromFile: string): string | undefined {
  let directory = path.dirname(path.resolve(fromFile));

  for (let ascent = 0; ascent < MAX_ASCENT; ascent += 1) {
    if (existsSync(path.join(directory, THRESHOLDS_FILE))) return directory;

    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
  return undefined;
}

/**
 * A malformed file falls back to the defaults instead of throwing.
 *
 * A linter that refuses to run because a number could not be read stops every
 * rule, including the ones that need no numbers at all. That covers a parse
 * that fails and a document that parses but cannot be read from.
 */
function parse(file: string): Thresholds {
  let contents: unknown;
  try {
    contents = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return DEFAULT_THRESHOLDS;
  }

  if (!isThresholdsDocument(contents)) return DEFAULT_THRESHOLDS;

  return {
    maxFileLines: positiveInteger(contents.maxFileLines) ?? DEFAULT_THRESHOLDS.maxFileLines,
    roleSuffixes: stringList(contents.roleSuffixes) ?? DEFAULT_THRESHOLDS.roleSuffixes,
    countComments: booleanValue(contents.countComments) ?? DEFAULT_THRESHOLDS.countComments,
    countBlankLines: booleanValue(contents.countBlankLines) ?? DEFAULT_THRESHOLDS.countBlankLines,
  };
}

/**
 * Whether the parsed file is a document this rule can read fields from.
 *
 * `JSON.parse('null')` succeeds, so a catch around the parse is not enough:
 * `null`, a scalar and an array all parse and all lack the fields below.
 * Reading one of them used to throw straight out of `readThresholds` and stop
 * the lint run — the exact outcome the malformed-file fallback exists to
 * prevent. Only a non-null, non-array object is a document; the values inside
 * it are still validated field by field.
 */
function isThresholdsDocument(value: unknown): value is ThresholdsFile {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Only a JSON boolean decides a counting policy.
 *
 * A missing field, `null`, `0`, `""` or any other non-boolean is not a
 * decision, and neither is the string `"true"` nor the number `1`. Truthiness
 * would accept the last two and reject the rest, turning a typo into a policy;
 * reading the type instead means only an explicit boolean chooses, and
 * everything else falls back to that field's default.
 */
function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** A ceiling of zero or minus one is a typo, not a decision, so it is refused. */
function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

/** Refuses a partially valid list: one non-string means the file was hand-edited wrong. */
function stringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length === value.length ? strings : undefined;
}
