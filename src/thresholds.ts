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
};

/** What a project gets before it decides otherwise. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  maxFileLines: 500,
  roleSuffixes: ['.types.ts', '.constants.ts', '.helpers.ts', '.schema.ts'],
};

type ThresholdsFile = {
  readonly maxFileLines?: unknown;
  readonly roleSuffixes?: unknown;
};

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
 * rule, including the ones that need no numbers at all.
 */
function parse(file: string): Thresholds {
  let contents: ThresholdsFile;
  try {
    contents = JSON.parse(readFileSync(file, 'utf8')) as ThresholdsFile;
  } catch {
    return DEFAULT_THRESHOLDS;
  }

  return {
    maxFileLines: positiveInteger(contents.maxFileLines) ?? DEFAULT_THRESHOLDS.maxFileLines,
    roleSuffixes: stringList(contents.roleSuffixes) ?? DEFAULT_THRESHOLDS.roleSuffixes,
  };
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function stringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length === value.length ? strings : undefined;
}
