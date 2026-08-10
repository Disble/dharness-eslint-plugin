// Tarball end-to-end gate: packs the package, installs the real tarball into a
// fresh consumer project, and proves both consumer paths resolve — `require`,
// which is how react-doctor loads a plugin, and `import`, which is how an
// ESLint flat config does.
//
// This is the regression net for entry-point drift, and it exists because that
// drift already happened once: an `exports` map naming files the build does not
// emit resolves perfectly in this repository, where the source sits right
// there, and fails only in a consumer that has nothing but `dist`.
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const packageRoot = process.cwd();

/** Every rule the plugin promises, so a dropped export fails here and not in a project. */
const EXPECTED_RULES = [
  'folder-ownership',
  'max-file-lines',
  'pure-index-barrel',
  'require-jsdoc',
  'require-variable-jsdoc',
  'role-file-shape',
];

// Tracked from creation so a failure can clean up whatever already exists.
let tarball = null;
let consumer = null;

function run(command, cwd) {
  return execSync(command, { cwd, stdio: 'pipe', encoding: 'utf8' });
}

function cleanup() {
  if (consumer !== null) rmSync(consumer, { recursive: true, force: true });
  if (tarball !== null) rmSync(tarball, { force: true });
}

function fail(message) {
  console.error(`pack e2e FAILED: ${message}`);
  // process.exit skips the finally block, so without this every failing run
  // leaves its tarball in the repository root, one `git add -A` from a commit.
  cleanup();
  process.exit(1);
}

const packOutput = JSON.parse(run('npm pack --json', packageRoot));
// npm <= 11 returns an array of entries; npm >= 12 keys them by package name.
// Accept both, because the publish job updates npm before it runs this.
const packed = Array.isArray(packOutput) ? packOutput[0] : Object.values(packOutput)[0];

if (!packed?.filename) fail(`npm pack --json returned no filename: ${JSON.stringify(packOutput).slice(0, 200)}`);

tarball = path.join(packageRoot, packed.filename);
consumer = mkdtempSync(path.join(tmpdir(), 'dharness-pack-e2e-'));

try {
  run('npm init -y', consumer);
  run(`npm install -D "${tarball}" eslint`, consumer);

  assertResolvesThrough('require', "const plugin = require('dharness-eslint-plugin');");
  assertResolvesThrough('import', "const plugin = (await import('dharness-eslint-plugin')).default;");
  assertRuleFiresInEslint();

  console.log('pack e2e: OK — require, import, and a real lint run verified from the packed tarball.');
} finally {
  cleanup();
}

/**
 * Proves one consumer entry point resolves and carries the whole plugin.
 *
 * react-doctor reaches the package through `require` and ESLint through
 * `import`, and the `exports` map answers each with a different file, so one
 * working says nothing about the other.
 * @param label - which entry point is under test, for the failure message.
 * @param load - the statement that binds `plugin` in the probe.
 */
function assertResolvesThrough(label, load) {
  const probe = path.join(consumer, `probe.${label}.mjs`);
  writeFileSync(
    probe,
    [
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      load,
      'const names = Object.keys(plugin.rules ?? {}).sort();',
      'console.log(JSON.stringify({ name: plugin.meta?.name, names }));',
      '',
    ].join('\n'),
  );

  let reported;
  try {
    reported = JSON.parse(run(`node "${probe}"`, consumer));
  } catch (error) {
    fail(`${label} could not load the packed package: ${String(error.stderr ?? error).slice(0, 300)}`);
  }

  if (reported.name !== 'dharness') {
    fail(`${label} loaded a plugin named ${reported.name ?? '(nothing)'}, and rule ids are scoped by that name`);
  }

  const missing = EXPECTED_RULES.filter((rule) => !reported.names.includes(rule));
  if (missing.length > 0) fail(`${label} is missing these rules: ${missing.join(', ')}`);
}

/**
 * Proves a rule actually reports through a real ESLint run, not just that the
 * module loaded. A plugin that resolves and rules that run are two claims.
 */
function assertRuleFiresInEslint() {
  writeFileSync(
    path.join(consumer, 'eslint.config.mjs'),
    [
      "import dharness from 'dharness-eslint-plugin';",
      '',
      'export default [',
      "  { files: ['**/*.js'], plugins: { dharness }, rules: { 'dharness/require-variable-jsdoc': 'error' } },",
      '];',
      '',
    ].join('\n'),
  );
  writeFileSync(path.join(consumer, 'undocumented.js'), 'export const value = 1;\n');

  let report = '';
  try {
    report = run('npx eslint undocumented.js --format json', consumer);
  } catch (error) {
    // eslint exits 1 when it finds errors, which is the expected path here.
    report = error.stdout ?? '';
  }

  const ruleIds = JSON.parse(report || '[]').flatMap((result) => result.messages.map((message) => message.ruleId));

  if (!ruleIds.includes('dharness/require-variable-jsdoc')) {
    fail(`no rule reported through eslint; got: ${ruleIds.join(', ') || '(none)'}`);
  }
}
