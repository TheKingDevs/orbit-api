import { afterEach, describe, expect, test } from 'bun:test';
import { downloadPinterestRoute } from '@routes/api/download/pinterest';
import { DownloaderService } from '@services/downloader.service';
import { storageService } from '@services/storage.service';
import { db } from '@utils/db.util';

const apiKey = db.getAllUsers().find(u => u.role === 'public')?.apiKey || process.env.PUBLIC_API_KEY || 'public-token';
const basePrototype = Object.getPrototypeOf((new DownloaderService() as any).target);
const originalResolvePinterestMedia = basePrototype.resolvePinterestMedia;
const originalSaveFromUrl = storageService.saveFromUrl;

afterEach(() => {
  basePrototype.resolvePinterestMedia = originalResolvePinterestMedia;
  storageService.saveFromUrl = originalSaveFromUrl;
});

describe('Endpoint /api/download/pinterest', () => {
  test('Deve aceitar com o parâmetro type=image', async () => {
    basePrototype.resolvePinterestMedia = async () => ({
      mediaType: 'image',
      directUrl: 'https://i.pinimg.com/736x/aa/bb/cc.jpg',
      metadata: { title: 'Pinterest Media', duration: 0, author: 'Pinterest' }
    });

    storageService.saveFromUrl = async () => ({
      filename: 'pinterest-test.jpg',
      path: '/tmp/pinterest-test.jpg',
      extension: 'jpg',
      mediaType: 'image'
    });

    const req = new Request('http://localhost:3000/api/download/pinterest?url=https://br.pinterest.com/pin/769834130090232508&type=image', {
      headers: { 'x-apikey': apiKey }
    });
    const url = new URL(req.url);
    const res = await downloadPinterestRoute(req, url);

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; downloadUrl: string; mediaType: string };
    expect(body.success).toBe(true);
    expect(body.mediaType).toBe('image');
    expect(body.downloadUrl).toBe('http://localhost:3000/storage/pinterest-test.jpg');
  });
});
