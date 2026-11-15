import { describe, expect, test } from 'bun:test';
import { storageRoute } from '@routes/public/storage';
import { db } from '@utils/db.util';
import { UnauthorizedError, NotFoundError } from '@errors/index';

describe('Autenticação do endpoint /storage', () => {
  test('rejeita acesso anônimo antes de verificar existência do arquivo', async () => {
    const url = new URL('http://localhost/storage/00000000000000000000000000000000.png');
    const req = new Request(url);

    await expect(storageRoute(req, url)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('aceita chave válida e só então responde sobre o arquivo', async () => {
    const apiKey = db.getAllUsers().find(user => user.role === 'public')?.apiKey || process.env.PUBLIC_API_KEY;
    expect(apiKey).toBeTruthy();

    const url = new URL('http://localhost/storage/00000000000000000000000000000000.png');
    const req = new Request(url, { headers: { 'x-apikey': apiKey! } });

    await expect(storageRoute(req, url)).rejects.toBeInstanceOf(NotFoundError);
  });
});
