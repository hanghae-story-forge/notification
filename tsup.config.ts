import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { tsconfig: 'tsconfig.json' },
  target: 'node24',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      '@/*': './src/*',
    };
  },
});
