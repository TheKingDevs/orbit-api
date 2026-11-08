#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const result = spawnSync(runner, [path.join(here, 'deploy.ts'), ...process.argv.slice(2)], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) {
  console.error(`Não foi possível iniciar a CLI Orbit: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
