import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { NotFoundError } from '@errors/index';

let cachedAsset: Buffer | undefined;

const candidates = [
  resolve(process.cwd(), 'node_modules/html-to-image/dist/html-to-image.js'),
  resolve(import.meta.dir, '../../../node_modules/html-to-image/dist/html-to-image.js'),
  resolve(import.meta.dir, '../node_modules/html-to-image/dist/html-to-image.js')
];

export function htmlToImageAssetRoute(): Response {
  if (!cachedAsset) {
    const assetPath = candidates.find(path => existsSync(path));

    if (!assetPath) {
      throw new NotFoundError('Biblioteca html-to-image não encontrada.');
    }

    cachedAsset = readFileSync(assetPath);
  }

  return new Response(cachedAsset, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
