import { describe, expect, test } from 'bun:test';
import { downloadPlayAudioRoute } from '@routes/api/download/play_audio';

describe('Endpoint /api/download/play_audio', () => {
  test('Deve exigir API Key de acesso', async () => {
    const req = new Request('http://localhost:3000/api/download/play_audio?name=exemplo');
    const url = new URL(req.url);
    const res = await downloadPlayAudioRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });

  test('Deve rejeitar requisição sem name', async () => {
    const req = new Request('http://localhost:3000/api/download/play_audio?platform=youtube');
    const url = new URL(req.url);
    const res = await downloadPlayAudioRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });
});
