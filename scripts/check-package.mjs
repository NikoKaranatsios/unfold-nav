import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(join(tmpdir(), 'unfold-nav-package-'));
const run = (command, args, cwd = temporary) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const [packed] = JSON.parse(
    run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], root),
  );
  const files = packed.files.map((file) => file.path);
  assert(
    files.every(
      (file) => file.startsWith('dist/') || ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md'].includes(file),
    ),
    'Unexpected public package contents',
  );
  for (const file of [
    'dist/unfold-nav.js',
    'dist/unfold-nav.umd.cjs',
    'dist/index.d.ts',
    'dist/index.d.cts',
    'LICENSE',
    'README.md',
  ])
    assert(files.includes(file), `Missing ${file}`);
  const consumer = join(temporary, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      join(temporary, packed.filename),
    ],
    consumer,
  );
  const metadata = JSON.parse(await readFile(join(consumer, 'node_modules/unfold-nav/package.json'), 'utf8'));
  assert.equal(Object.keys(metadata.dependencies ?? {}).length, 0, 'Library must have no runtime dependencies');
  const smoke = `
    const assert = require('node:assert/strict');
    const cjs = require('unfold-nav');
    const esm = await import('unfold-nav');
    assert.deepEqual(Object.keys(cjs).sort(), Object.keys(esm).sort());
    for (const api of [cjs, esm]) {
      const tree = api.buildTree([{ label: 'Home', href: '/' }]);
      assert.equal(api.findCurrent(tree, '/', 'https://example.com').page.label, 'Home');
      api.define();
      assert.throws(() => api.createUnfoldNav({ pages: [] }), /browser after mounting/);
    }
  `;
  run(
    'node',
    [
      '--input-type=module',
      '-e',
      `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); ${smoke}`,
    ],
    consumer,
  );
  const source = `import { createUnfoldNav, buildTree, type NavPage } from 'unfold-nav';
    const pages: NavPage[] = [{ label: 'Home', href: '/' }];
    const nav = createUnfoldNav({ pages });
    const element: import('unfold-nav').UnfoldNav = document.createElement('unfold-nav');
    nav.addEventListener('unfold-select', event => { const label: string = event.detail.page.label; console.log(label); });
    nav.configure({ labels: 'auto' }); buildTree(pages); console.log(element.isOpen);
  `;
  for (const extension of ['mts', 'cts', 'ts']) await writeFile(join(consumer, `consumer.${extension}`), source);
  const compiler = resolve(root, 'node_modules/typescript/bin/tsc');
  const common = [
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    'false',
    '--target',
    'ES2022',
    '--lib',
    'ES2022,DOM,DOM.Iterable',
  ];
  run(
    'node',
    [compiler, ...common, '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.mts', 'consumer.cts'],
    consumer,
  );
  run('node', [compiler, ...common, '--module', 'ESNext', '--moduleResolution', 'Bundler', 'consumer.ts'], consumer);
  console.log(
    `Package verified: ${files.length} files; fresh install, ESM, CommonJS, SSR and strict TypeScript consumers pass.`,
  );
} catch (error) {
  if (error.stdout) console.error(String(error.stdout));
  if (error.stderr) console.error(String(error.stderr));
  throw error;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
