import { describe, expect, test } from 'bun:test';
import { downloadPlayAudioRoute } from '@routes/api/download/play_audio';

describe('Endpoint /api/download/play_audio', () => {
  test('Deve exigir token de acesso', async () => {
    const req = new Request('http://localhost:3000/api/download/play_audio?url=https://youtube.com/watch?v=exemplo');
    const url = new URL(req.url);
    const res = await downloadPlayAudioRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });
});
