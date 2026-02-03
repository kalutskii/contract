import { tsconfigPathsPlugin } from 'esbuild-plugin-tsconfig-paths';
import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'], // Output format: ES modules
  target: 'esnext', // Target environment

  dts: true, // Generates TypeScript declaration files
  clean: true, // Clean output directory before each build
  bundle: true, // Bundle all dependencies into the output files
  splitting: false, // Disable code splitting for single-file outputs

  esbuildPlugins: [tsconfigPathsPlugin()], // To resolve path aliases from tsconfig.json
  entry: ['index.ts', 'cli.entrypoint.ts'],
});
