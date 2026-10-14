import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url);

async function exists(url) {
  try {
    await stat(url);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out = []) {
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) await walk(path, out);
    else out.push(path);
  }
  return out;
}

function fail(message) {
  console.error(`Activity check failed: ${message}`);
  process.exitCode = 1;
}

if (!(await exists(dist))) {
  fail('dist/ does not exist. Run the production build first.');
} else {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

  if (/(?:src|href)=["']\/(?!\/)/i.test(html)) {
    fail('dist/index.html contains a root-absolute asset URL. Keep Vite base="./" for Discord proxy paths.');
  }

  if (/(?:src|href)=["']https?:\/\//i.test(html)) {
    fail('dist/index.html loads an external asset. Bundle it locally or add an explicit Discord URL mapping.');
  }

  const files = await walk(new URL('../dist/', import.meta.url).pathname);
  const sizes = await Promise.all(files.map(async (file) => (await stat(file)).size));
  const totalBytes = sizes.reduce((a, b) => a + b, 0);
  const rootPath = new URL('../', import.meta.url).pathname;

  console.log(`Activity check OK: ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
  for (const file of files.slice(0, 10)) console.log(`  - ${relative(rootPath, file)}`);
  if (files.length > 10) console.log(`  - ... ${files.length - 10} more`);
}
