import { describe, expect, test } from 'bun:test';
import { userBalanceRoute } from '@routes/api/user/balance';

describe('Endpoint /api/user/balance', () => {
  test('Deve retornar o saldo sem consumir créditos', async () => {
    const req = new Request('http://localhost:3000/api/user/balance?token=public-token');
    const res = await userBalanceRoute(req);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
  });
});
