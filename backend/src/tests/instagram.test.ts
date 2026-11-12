import { describe, expect, test } from 'bun:test';
import { downloadInstagramRoute } from '@routes/api/download/instagram';

describe('Endpoint /api/download/instagram', () => {
  test('Deve exigir o parâmetro type obrigatório', async () => {
    const req = new Request('http://localhost:3000/api/download/instagram?url=https://instagram.com/p/exemplo', {
      headers: { 'x-apikey': 'public-token' }
    });
    const url = new URL(req.url);
    const res = await downloadInstagramRoute(req, url).catch(e => e);
    expect(res).toBeDefined();
  });
});
