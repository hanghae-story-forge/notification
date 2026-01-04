import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  outDir: 'dist',
  esbuildOptions(options) {
    options.conditions = ['node'];
  },
});
