import { readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

interface BuildConfig {
  entrypoints: string[];
  outfile: string;
  target: 'bun';
  compile: boolean;
  bytecode: boolean;
  minify: boolean;
}

const root = join(import.meta.dir, '..');
const config = JSON.parse(
  readFileSync(join(root, 'build.config.json'), 'utf8'),
) as BuildConfig;
const outfile = join(root, config.outfile);

await rm(join(root, 'dist'), { recursive: true, force: true });
await mkdir(dirname(outfile), { recursive: true });

const args = [process.execPath, 'build'];

if (config.compile) args.push('--compile');
if (config.bytecode) args.push('--bytecode');
if (config.minify) args.push('--minify');

args.push(`--target=${config.target}`, `--outfile=${outfile}`, ...config.entrypoints);

const result = Bun.spawnSync({
  cmd: args,
  cwd: root,
  stdout: 'inherit',
  stderr: 'inherit',
});

if (result.exitCode !== 0) {
  process.exit(result.exitCode ?? 1);
}
