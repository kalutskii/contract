import { defineConfig } from 'tsup';

const tsupConfig = defineConfig({
  target: 'esnext',
  format: ['esm'], // Only 'esm' format is supported
  outDir: 'dist', // Output directory for compiled files
  entry: ['src/main.ts', 'src/modules/**/*.ts'], // Entry points for the application
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});

export default tsupConfig;
