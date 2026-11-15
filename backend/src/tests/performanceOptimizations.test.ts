import { afterEach, describe, expect, test } from 'bun:test';
import { CanvasService } from '@services/canvas.service';
import { DownloaderService } from '@services/downloader.service';
import { devWorldBRService } from '@services/devworldbr.service';
import { storageService } from '@services/storage.service';
import { db } from '@utils/db.util';
import { firstSuccessful } from '@utils/async.util';
import type { User } from '@models/User';
import dwbr from 'devworldbr-sdk';

const originalFetch = globalThis.fetch;
const originalSaveFromUrl = storageService.saveFromUrl;
const originalRegisterRemote = storageService.registerRemote;
const originalYtSearch = devWorldBRService.ytSearch;
const originalYoutubeMediaSource = devWorldBRService.youtubeMediaSource;
const originalChatgpt = dwbr.chatgpt;
const originalTiktokImages = dwbr.tiktok_images;

function asFetch(handler: () => Promise<Response>): typeof fetch {
  return handler as unknown as typeof fetch;
}

function testUser(id: string): User {
  return {
    id,
    email: `${id}@example.test`,
    apiKey: `key-${id}`,
    token: `key-${id}`,
    plan: 'free',
    role: 'public',
    dailyRequests: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    monthlyRequests: 0,
    lastMonthlyResetMonth: new Date().toISOString().slice(0, 7),
    violationCount: 0
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  storageService.saveFromUrl = originalSaveFromUrl;
  storageService.registerRemote = originalRegisterRemote;
  devWorldBRService.ytSearch = originalYtSearch;
  devWorldBRService.youtubeMediaSource = originalYoutubeMediaSource;
  dwbr.chatgpt = originalChatgpt;
  dwbr.tiktok_images = originalTiktokImages;
});

describe('rotas rápidas sem provedores externos', () => {
  test('TikTok short link não espera três segundos antes de resolver', async () => {
    globalThis.fetch = asFetch(async () => Response.json({
      code: 0,
      data: { play: 'https://cdn.tiktok.com/video.mp4', title: 'Vídeo de teste' }
    }));
    let registeredProvider: string | undefined;
    storageService.registerRemote = async (_url, mediaType, extension, provider) => {
      registeredProvider = provider;
      return {
        filename: `${'a'.repeat(32)}.mp4`,
        path: '/tmp/tiktok-test.mp4',
        extension: extension || 'mp4',
        mediaType
      };
    };

    const start = performance.now();
    const result = await new DownloaderService().processDownload({
      url: 'https://vm.tiktok.com/ZSpk6mMKE/',
      platform: 'tiktok',
      type: 'video'
    }, { baseUrl: 'http://localhost:3000' });

    expect(performance.now() - start).toBeLessThan(1_000);
    expect(result.success).toBe(true);
    expect(result.mediaType).toBe('video');
    expect(registeredProvider).toBe('tikwm');
  });

  test('YouTube devolve referência de storage sem baixar o arquivo na requisição', async () => {
    globalThis.fetch = asFetch(async () => Response.json({ title: 'Vídeo de teste', author_name: 'Canal', thumbnail_url: 'https://i.ytimg.com/vi/test/hqdefault.jpg' }));
    devWorldBRService.youtubeMediaSource = () => 'https://api.devworldbr.site/api/downloads/youtube/video/v1?link=https%3A%2F%2Fyoutube.com%2Fwatch%3Fv%3Dtest';
    storageService.saveFromUrl = async () => {
      throw new Error('A rota não deve baixar o arquivo durante a resolução.');
    };
    storageService.registerRemote = async (_url, mediaType, extension) => ({
      filename: `${'b'.repeat(32)}.${extension}`,
      path: '/tmp/youtube-test.mp4',
      extension: extension || 'mp4',
      mediaType
    });

    const start = performance.now();
    const result = await new DownloaderService().processDownload({
      url: 'https://www.youtube.com/watch?v=test',
      platform: 'youtube',
      type: 'video'
    }, { baseUrl: 'http://localhost:3000' });

    expect(performance.now() - start).toBeLessThan(1_000);
    expect(result.success).toBe(true);
    expect(result.downloadUrl).toContain('/storage/');
  });

  test('Canvas padrão usa avatar local sem buscar serviço externo', async () => {
    const internals = CanvasService as unknown as {
      loadRemoteImage: (url: string) => Promise<unknown>;
    };
    const originalLoadRemoteImage = internals.loadRemoteImage;
    let remoteLoads = 0;
    internals.loadRemoteImage = async () => {
      remoteLoads += 1;
      throw new Error('A rota padrão não deve depender de rede.');
    };

    try {
      const start = performance.now();
      const result = await CanvasService.generateWelcomeCard({
        username: 'Codex Test',
        avatarUrl: undefined,
        bgUrl: undefined
      });

      expect(result.length).toBeGreaterThan(0);
      expect(remoteLoads).toBe(0);
      expect(performance.now() - start).toBeLessThan(2_500);
    } finally {
      internals.loadRemoteImage = originalLoadRemoteImage;
    }
  });

  test('provedor lento devolve timeout e não registra o prompt', async () => {
    const previousTimeout = process.env.PROVIDER_TIMEOUT_MS;
    process.env.PROVIDER_TIMEOUT_MS = '250';
    dwbr.chatgpt = async () => new Promise(resolve => {
      setTimeout(() => resolve({ response: 'ok' }), 1_000);
    });

    try {
      const start = performance.now();
      await expect(devWorldBRService.gpt('consulta sintética de teste'))
        .rejects.toMatchObject({ statusCode: 504 });
      expect(performance.now() - start).toBeLessThan(900);
    } finally {
      if (previousTimeout === undefined) delete process.env.PROVIDER_TIMEOUT_MS;
      else process.env.PROVIDER_TIMEOUT_MS = previousTimeout;
    }

    await new Promise(resolve => setTimeout(resolve, 250));
  }, 5_000);
});

describe('cache de uso e índice de usuários', () => {
  test('findById resolve pelo índice e some após exclusão', async () => {
    const user = testUser(`usr-find-${crypto.randomUUID()}`);
    await db.addUser(user);

    try {
      expect(db.findById(user.id)).toBe(user);

      user.name = 'Nome atualizado';
      await db.saveUser(user);

      expect(db.findById(user.id)).toBe(user);
    } finally {
      await db.deleteUserById(user.id);
    }

    expect(db.findById(user.id)).toBeUndefined();
  });

  test('leituras simultâneas compartilham o mesmo resultado e novas requisições invalidam o cache', async () => {
    const user = testUser(`usr-usage-${crypto.randomUUID()}`);
    await db.addUser(user);

    try {
      const now = Date.now();
      db.recordRequest(user.id, {
        method: 'GET',
        path: '/api/test/first',
        status: 200,
        timestamp: now - 1_000,
        durationMs: 4
      });

      const [first, second] = await Promise.all([
        db.getUsageStats(user.id, 7),
        db.getUsageStats(user.id, 7)
      ]);

      expect(first).toBe(second);
      expect(first.totalRequests).toBe(1);

      db.recordRequest(user.id, {
        method: 'POST',
        path: '/api/test/second',
        status: 201,
        timestamp: now,
        durationMs: 6
      });

      const third = await db.getUsageStats(user.id, 7);

      expect(third).not.toBe(first);
      expect(third.totalRequests).toBe(2);
      expect(third.recent[0].path).toBe('/api/test/second');
      expect(third.topEndpoints).toEqual(
        expect.arrayContaining([
          { path: '/api/test/first', count: 1 },
          { path: '/api/test/second', count: 1 }
        ])
      );
    } finally {
      await db.deleteUserById(user.id);
    }
  });
});

describe('corrida de fontes redundantes', () => {
  test('firstSuccessful devolve a primeira resposta sem esperar a tarefa lenta', async () => {
    const start = performance.now();
    const result = await firstSuccessful([
      () => new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('fonte lenta')), 400);
      }),
      () => new Promise<string>(resolve => {
        setTimeout(() => resolve('fonte rápida'), 20);
      })
    ]);

    expect(result).toBe('fonte rápida');
    expect(performance.now() - start).toBeLessThan(250);
  });

  test('firstSuccessful rejeita com o primeiro erro quando todas falham', async () => {
    await expect(firstSuccessful([
      () => Promise.reject(new Error('primeiro erro')),
      () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('segundo erro')), 20);
      })
    ])).rejects.toThrow('primeiro erro');
  });

  test('imagens do TikTok usam o fallback TikWM sem aguardar o provedor lento', async () => {
    dwbr.tiktok_images = async () => new Promise(resolve => {
      setTimeout(() => resolve({ resultado: { 1: 'https://cdn.devworldbr.test/1.jpg' } }), 800);
    });
    globalThis.fetch = asFetch(async () => Response.json({
      code: 0,
      data: {
        title: 'Fotos de teste',
        author: { nickname: 'Autora' },
        images: ['https://cdn.tiktok.test/1.jpg', 'https://cdn.tiktok.test/2.jpg']
      }
    }));

    const start = performance.now();
    const result = await devWorldBRService.tiktokImages(
      'https://www.tiktok.com/@orbit/video/123456789'
    );

    expect(performance.now() - start).toBeLessThan(500);
    expect(result.imagens).toEqual([
      'https://cdn.tiktok.test/1.jpg',
      'https://cdn.tiktok.test/2.jpg'
    ]);
    expect(result.titulo).toBe('Fotos de teste');
    expect(result.autor).toBe('Autora');
  });

  test('Pinterest escolhe a mídia principal e ignora avatares do provedor', () => {
    const service = new DownloaderService() as unknown as {
      pickPinterestUrl: (response: unknown, type: string) => string | undefined;
    };
    const response = {
      resultado: {
        imagem: 'https://i.pinimg.com/236x/aa/bb/cc.jpg',
        avatar: 'https://i.pinimg.com/75x75/avatar.jpg',
        video: 'https://v1.pinimg.com/videos/iht/720p/clip.mp4'
      }
    };

    expect(service.pickPinterestUrl(response, 'image'))
      .toBe('https://i.pinimg.com/236x/aa/bb/cc.jpg');
    expect(service.pickPinterestUrl(response, 'video'))
      .toBe('https://v1.pinimg.com/videos/iht/720p/clip.mp4');
  });

  test('Pinterest vence pelo provedor no hedge sem esperar o scraper lento', async () => {
    const service = new DownloaderService() as unknown as {
      resolvePinterestMedia: (url: string, type: string) => Promise<unknown>;
      resolvePinterestViaProvider: (url: string, type: string) => Promise<unknown>;
      resolvePinterestWithFallback: (url: string, type: string) => Promise<{ directUrl: string }>;
    };

    service.resolvePinterestMedia = async () => {
      await new Promise(resolve => setTimeout(resolve, 900));
      return undefined;
    };
    service.resolvePinterestViaProvider = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        mediaType: 'image',
        directUrl: 'https://i.pinimg.com/originals/test.jpg',
        metadata: { title: 'Pinterest', duration: 0, author: 'Pinterest' }
      };
    };

    const start = performance.now();
    const result = await service.resolvePinterestWithFallback(
      'https://www.pinterest.com/pin/123456789/',
      'image'
    );

    expect(result.directUrl).toContain('pinimg.com');
    expect(performance.now() - start).toBeLessThan(750);
  });
});
