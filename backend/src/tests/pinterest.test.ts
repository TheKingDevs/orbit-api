import { describe, expect, test } from 'bun:test';
import { downloadPinterestRoute } from '@routes/api/download/pinterest';

describe('Endpoint /api/download/pinterest', () => {
  test('Deve aceitar com o parâmetro type=image', async () => {
    const req = new Request('http://localhost:3000/api/download/pinterest?url=https://br.pinterest.com/pin/769834130090232508&type=image&token=public-token');
    const url = new URL(req.url);
    const res = await downloadPinterestRoute(req, url);
    expect(res.status).toBe(200);
  });
});
