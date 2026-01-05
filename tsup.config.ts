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
  treeshake: false,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  esbuildOptions(options) {
    options.plugins = [
      pathAlias({
        baseUrl: './src',
        aliases: {
          '@/*': './*',
          '@core/*': './core/*',
          '@infrastructure/*': './infrastructure/*',
          '@presentation/*': './presentation/*',
        },
      }),
    ];
  },
});
