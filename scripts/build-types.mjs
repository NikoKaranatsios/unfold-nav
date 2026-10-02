import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist');
for (const name of await readdir(dist)) {
  if (!name.endsWith('.d.ts')) continue;
  const file = resolve(dist, name);
  // tsc emits private members as single-line declarations. Strip them so ESM and CJS
  // public types are structural and can share the global DOM declarations.
  const source = await readFile(file, 'utf8');
  const text = source.replace(/(?:^[ \t]+\/\*\*(?:(?!\*\/)[\s\S])*\*\/\r?\n)?^[ \t]+private\b[^\n]*;\r?\n/gm, '');
  if (/^[ \t]+private\b/m.test(text)) throw new Error(`Unexpected private declaration in ${name}`);
  await writeFile(file, text);
  await writeFile(
    resolve(dist, name.replace(/\.d\.ts$/, '.d.cts')),
    text.replace(/(from\s+['"]\.\/[^'"]+)\.js(['"])/g, '$1.cjs$2'),
  );
}
