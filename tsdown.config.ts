import { defineConfig } from 'tsdown';

// Both formats ship on purpose. react-doctor loads a plugin with `require`,
// so a package that only declares `import` cannot be loaded by it at all —
// which is exactly what stopped its predecessor from working.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outExtensions: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
});
