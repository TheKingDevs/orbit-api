import { afterEach, describe, expect, test } from 'bun:test';
import { DangerError } from '@errors/index';
import { DownloaderService } from '@services/downloader.service';
import { devWorldBRService } from '@services/devworldbr.service';
import { resolvePublicBaseUrl } from '@utils/publicBaseUrl.util';

const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL;
const originalFrontendUrl = process.env.FRONTEND_URL;
const originalYtSearch = devWorldBRService.ytSearch;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv('PUBLIC_BASE_URL', originalPublicBaseUrl);
  restoreEnv('FRONTEND_URL', originalFrontendUrl);
  devWorldBRService.ytSearch = originalYtSearch;
});

describe('origem pública dos links de storage', () => {
  test('prioriza PUBLIC_BASE_URL configurada', () => {
    process.env.PUBLIC_BASE_URL = 'https://0rbit-api.vercel.app/';
    delete process.env.FRONTEND_URL;

    const req = new Request('http://orbit-api-7z21.onrender.com/api/download/ytdl_audio');
    const base = resolvePublicBaseUrl(req, new URL(req.url));

    expect(base).toBe('https://0rbit-api.vercel.app');
  });

  test('usa a origem encaminhada pelo proxy do frontend', () => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.FRONTEND_URL;

    const req = new Request('http://orbit-api-7z21.onrender.com/api/download/ytdl_audio', {
      headers: { 'x-public-base-url': 'https://0rbit-api.vercel.app' }
    });
    const base = resolvePublicBaseUrl(req, new URL(req.url));

    expect(base).toBe('https://0rbit-api.vercel.app');
  });

  test('usa x-forwarded-host e x-forwarded-proto quando não há header dedicado', () => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.FRONTEND_URL;

    const req = new Request('http://orbit-api-7z21.onrender.com/api/download/ytdl_audio', {
      headers: {
        'x-forwarded-host': '0rbit-api.vercel.app',
        'x-forwarded-proto': 'https'
      }
    });
    const base = resolvePublicBaseUrl(req, new URL(req.url));

    expect(base).toBe('https://0rbit-api.vercel.app');
  });

  test('mantém a origem local quando não há proxy', () => {
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.FRONTEND_URL;

    const req = new Request('http://localhost:3000/api/download/ytdl_audio');
    const base = resolvePublicBaseUrl(req, new URL(req.url));

    expect(base).toBe('http://localhost:3000');
  });
});

describe('status de erros do provedor', () => {
  test('processDownload preserva o status 504 do provedor', async () => {
    devWorldBRService.ytSearch = async () => {
      throw new DangerError('O serviço externo excedeu o tempo limite.', 504);
    };

    const service = new DownloaderService();
    const promise = service.processDownload(
      {
        url: 'https://www.youtube.com/watch?v=test',
        name: 'video de teste',
        platform: 'youtube',
        type: 'video'
      },
      { baseUrl: 'https://0rbit-api.vercel.app' }
    );

    await expect(promise).rejects.toMatchObject({ statusCode: 504 });
  });
});
