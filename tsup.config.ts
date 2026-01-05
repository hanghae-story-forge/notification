import { defineConfig } from 'tsup';
import pathAlias from 'esbuild-plugin-path-alias';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  target: 'node24',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  esbuildOptions(options) {
    options.plugins = options.plugins || [];
    options.plugins.push(
      pathAlias({
        '@/*': './src/*',
        '@core/*': './src/core/*',
        '@infrastructure/*': './src/infrastructure/*',
        '@presentation/*': './src/presentation/*',
      })
    );
  },
});
