import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // `vite build --mode showcase`: the showcase as a static site (index.html + site.html) in showcase-dist/.
  if (mode === 'showcase') {
    return {
      base: './',
      build: {
        outDir: 'showcase-dist',
        emptyOutDir: true,
        rollupOptions: {
          input: { index: resolve(import.meta.dirname, 'index.html'), site: resolve(import.meta.dirname, 'site.html') },
        },
      },
    };
  }

  // `vite build`: the library. `vite` (dev) serves the showcase.
  return {
    build:
      command === 'build'
        ? {
            lib: {
              entry: 'src/index.ts',
              name: 'UnfoldNav',
              fileName: 'unfold-nav',
            },
            sourcemap: true,
          }
        : undefined,
    test: { environment: 'node' },
  };
});
