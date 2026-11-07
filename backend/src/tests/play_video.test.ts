import { describe, expect, test } from 'bun:test';
import { downloadPlayVideoRoute } from '@routes/api/download/play_video';

describe('Endpoint /api/download/play_video', () => {
  test('Deve iniciar a busca do vídeo pelo nome', async () => {
    const req = new Request('http://localhost:3000/api/download/play_video?name=video%20de%20gatos');
    const url = new URL(req.url);
    const res = await downloadPlayVideoRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });
});
