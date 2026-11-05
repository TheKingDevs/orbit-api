import { accessSync, constants, mkdirSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { join } from 'path';
import { DangerError } from '@errors/index';

let cachedDirectory: string | null = null;

function isUsable(directory: string): boolean {
  try {
    mkdirSync(directory, { recursive: true });
    accessSync(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getTempDir(): string {
  if (cachedDirectory) return cachedDirectory;

  const candidates = [
    tmpdir(),
    join(homedir(), '.cache', 'orbit', 'tmp'),
    join(process.cwd(), '.orbit-tmp')
  ];

  for (const candidate of candidates) {
    if (!isUsable(candidate)) continue;

    cachedDirectory = candidate;
    return candidate;
  }

  throw new DangerError('Nenhum diretório temporário gravável foi encontrado.');
}
