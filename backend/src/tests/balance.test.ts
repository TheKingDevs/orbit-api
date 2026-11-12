import { describe, expect, test } from 'bun:test';
import { userBalanceRoute } from '@routes/api/user/balance';
import { db } from '@utils/db.util';

describe('Endpoint /api/user/balance', () => {
  const apiKey = db.getAllUsers()[0]?.apiKey || process.env.PUBLIC_API_KEY || 'public-token';

  test('Deve rejeitar API Key em query string', async () => {
    const req = new Request(`http://localhost:3000/api/user/balance?apikey=${apiKey}`);
    const result = await userBalanceRoute(req).catch((error) => error);
    expect(result).toBeInstanceOf(Error);
  });

  test('Deve retornar o saldo via header x-apikey', async () => {
    const req = new Request('http://localhost:3000/api/user/balance', {
      headers: { 'x-apikey': apiKey }
    });
    const res = await userBalanceRoute(req);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
  });

  test('Deve rejeitar requisição com header Authorization', async () => {
    const req = new Request('http://localhost:3000/api/user/balance', {
      headers: { authorization: `Bearer ${apiKey}` }
    });
    const res = await userBalanceRoute(req).catch((err) => err);
    expect(res).toBeInstanceOf(Error);
  });
});
