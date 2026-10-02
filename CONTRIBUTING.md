# Contributing

Use Node 24 (`nvm use`) and pnpm 12.8.1. Node 22.12+ is also supported for development.

```bash
pnpm install --frozen-lockfile
pnpm dev --port 5174
pnpm format
pnpm check
pnpm build:showcase
```

`src/` contains the library. `demo/` contains fictional showcase sites and themes; its Lucide dependency is development-only. The published package contains the library, declarations, README, changelog and MIT license.

For layout changes, test desktop and phone sizes, edge and centre positions, long labels, and open branches. `test/layout.test.ts` covers the showcase trees and Circuit clearance. `test/element.test.ts` covers registration, invalid updates, keyboard selection, cancellation and cleanup. DOM tests use an emulated browser; check visuals and pointer behavior in a real browser too.

Use `pnpm format` before committing. `pnpm check` runs formatting, type checking, tests, the library build and a fresh tarball install with ESM, CommonJS, server import and strict TypeScript consumers. The showcase build has a separate command. GitHub CI runs both on Node 22 and 24.

Open an [issue](https://github.com/NikoKaranatsios/unfold-nav/issues) with a minimal pages array, options, browser/version, viewport and steps to reproduce. For UI issues, include the theme, font and a screenshot if possible. Keep pull requests focused and explain the resulting behavior and how you checked it.

For a release, update the version and changelog, run the checks, review `npm pack --dry-run`, and follow the README publishing instructions. Build output, local launch settings and npm credentials do not belong in commits.
