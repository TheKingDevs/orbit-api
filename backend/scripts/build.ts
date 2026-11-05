import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

interface BuildConfig {
  entrypoints: string[];
  outdir: string;
  external: string[];
}

const root = join(import.meta.dir, '..');
const config = JSON.parse(
  readFileSync(join(root, 'build.config.json'), 'utf8'),
) as BuildConfig;

await rm(join(root, config.outdir), { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: config.entrypoints.map((entry) => join(root, entry)),
  outdir: join(root, config.outdir),
  target: 'bun',
  external: config.external,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
