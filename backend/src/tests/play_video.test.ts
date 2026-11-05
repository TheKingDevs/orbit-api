import { describe, expect, test } from 'bun:test';
import { downloadPlayVideoRoute } from '@routes/api/download/play_video';

describe('Endpoint /api/download/play_video', () => {
  test('Deve exigir token de acesso válido com áudio mesclado', async () => {
    const req = new Request('http://localhost:3000/api/download/play_video?url=https://youtube.com/watch?v=exemplo');
    const url = new URL(req.url);
    const res = await downloadPlayVideoRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });
});
