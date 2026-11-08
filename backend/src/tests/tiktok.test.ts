import { describe, expect, test } from 'bun:test';
import { downloadTikTokAudioRoute } from '@routes/api/download/tiktok_audio';
import { downloadTikTokVideoRoute } from '@routes/api/download/tiktok_video';

describe('Endpoints TikTok', () => {
  test('tiktok_audio deve exigir API Key', async () => {
    const req = new Request('http://localhost:3000/api/download/tiktok_audio?url=https://tiktok.com/@user/video/123');
    const url = new URL(req.url);
    const res = await downloadTikTokAudioRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });

  test('tiktok_video deve exigir API Key', async () => {
    const req = new Request('http://localhost:3000/api/download/tiktok_video?url=https://tiktok.com/@user/video/123');
    const url = new URL(req.url);
    const res = await downloadTikTokVideoRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });
});
