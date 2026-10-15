import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'weapons');
const SOURCE_COMMIT = 'c8db197f0066213b2bc0d22de372e86535225475';
const SOURCE_BASE = `https://raw.githubusercontent.com/scoof-pri/prida/${SOURCE_COMMIT}/public/models`;

export const ASSETS = [
  { file: 'kx9-smg.glb', source: 'smg.glb', gitSha: 'c057894b2509fc8ba20eeda9d2e62c1fd8d1b042' },
  { file: 'mg46-lmg.glb', source: 'rifle.glb', gitSha: 'e3f9d160e1930b103f4f15757242756356c2640f' },
  { file: 'mr14-dmr.glb', source: 'marksman.glb', gitSha: '76c295d40bb047aeb668247c821cd7b53dd666e4' },
  { file: 'hx44-magnum.glb', source: 'revolver.glb', gitSha: 'eacbe9032928b591ea8b51d16050be63ff73d3da' },
  { file: 'sg12-autoshotgun.glb', source: 'shotgun.glb', gitSha: 'c3b0efb3472fd09a47e5dc65d7d8f81b6261cddd' },
];

function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

async function validExisting(path, expected) {
  try {
    return gitBlobSha(await readFile(path)) === expected;
  } catch {
    return false;
  }
}

async function fetchAsset(asset) {
  const path = join(OUT, asset.file);
  if (await validExisting(path, asset.gitSha)) {
    console.log(`[weapon-assets] verified ${asset.file}`);
    return;
  }

  const url = `${SOURCE_BASE}/${asset.source}`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Failed to fetch ${asset.source}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = gitBlobSha(bytes);
  if (actual !== asset.gitSha) {
    throw new Error(`Integrity mismatch for ${asset.source}: expected ${asset.gitSha}, got ${actual}`);
  }
  await writeFile(path, bytes);
  console.log(`[weapon-assets] fetched ${asset.file} (${bytes.length} bytes)`);
}

await mkdir(OUT, { recursive: true });
await Promise.all(ASSETS.map(fetchAsset));
