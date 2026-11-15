import { afterEach, describe, expect, test } from 'bun:test';
import { CanvasService } from '@services/canvas.service';
import { DownloaderService } from '@services/downloader.service';
import { devWorldBRService } from '@services/devworldbr.service';
import { storageService } from '@services/storage.service';
import dwbr from 'devworldbr-sdk';

const originalFetch = globalThis.fetch;
const originalSaveFromUrl = storageService.saveFromUrl;
const originalRegisterRemote = storageService.registerRemote;
const originalYtSearch = devWorldBRService.ytSearch;
const originalYoutubeMediaSource = devWorldBRService.youtubeMediaSource;
const originalChatgpt = dwbr.chatgpt;

afterEach(() => {
  globalThis.fetch = originalFetch;
  storageService.saveFromUrl = originalSaveFromUrl;
  storageService.registerRemote = originalRegisterRemote;
  devWorldBRService.ytSearch = originalYtSearch;
  devWorldBRService.youtubeMediaSource = originalYoutubeMediaSource;
  dwbr.chatgpt = originalChatgpt;
});

describe('rotas rápidas sem provedores externos', () => {
  test('TikTok short link não espera três segundos antes de resolver', async () => {
    globalThis.fetch = async () => Response.json({
      code: 0,
      data: { play: 'https://cdn.tiktok.com/video.mp4', title: 'Vídeo de teste' }
    });
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
    globalThis.fetch = async () => Response.json({ title: 'Vídeo de teste', author_name: 'Canal', thumbnail_url: 'https://i.ytimg.com/vi/test/hqdefault.jpg' });
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
      const result = await CanvasService.generateWelcomeCard({ username: 'Codex Test' });

      expect(result.length).toBeGreaterThan(0);
      expect(remoteLoads).toBe(0);
      expect(performance.now() - start).toBeLessThan(2_500);
    } finally {
      internals.loadRemoteImage = originalLoadRemoteImage;
    }
  });

  test('provedor lento devolve timeout antes de três segundos e não registra o prompt', async () => {
    dwbr.chatgpt = async () => new Promise(resolve => {
      setTimeout(() => resolve({ response: 'ok' }), 2_350);
    });

    const start = performance.now();
    await expect(devWorldBRService.gpt('consulta sintética de teste'))
      .rejects.toMatchObject({ statusCode: 504 });
    expect(performance.now() - start).toBeLessThan(2_900);

    await new Promise(resolve => setTimeout(resolve, 250));
  }, 5_000);
});
