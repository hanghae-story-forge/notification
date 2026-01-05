import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  target: 'node24',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: false,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
});
