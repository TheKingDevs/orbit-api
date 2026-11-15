import { DangerError, InvalidParameterError } from '@errors/index';
import type { IBtchDownloaderService } from '@interface/IBtchDownloader';
import type { BtchDownloadPlatform } from '@apptypes/download.type';
import { Logger } from '@utils/logger';
import { validateSafeUrl } from '@utils/urlSecurity.util';
import type { TrustedPlatform } from '@utils/urlSecurity.util';
import { providerTimeoutMs } from '@utils/timeout.util';

type DownloadMethod = (url: string) => Promise<unknown>;
type DownloaderName = 'spotify' | 'threads' | 'gdrive' | 'capcut' | 'twitter';
type DownloaderDefinition = { label: string; platform: TrustedPlatform; method: DownloaderName };
const MAX_CONCURRENT_CALLS = 4;
let activeCalls = 0;

const DOWNLOADERS: Record<BtchDownloadPlatform, DownloaderDefinition> = {
  spotify: { label: 'Spotify', platform: 'spotify', method: 'spotify' },
  threads: { label: 'Threads', platform: 'threads', method: 'threads' },
  'google-drive': { label: 'Google Drive', platform: 'google-drive', method: 'gdrive' },
  capcut: { label: 'CapCut', platform: 'capcut', method: 'capcut' },
  twitter: { label: 'Twitter/X', platform: 'twitter', method: 'twitter' }
};

type BtchSdk = Pick<typeof import('btch-downloader'), DownloaderName>;
let sdkPromise: Promise<BtchSdk> | undefined;

function loadSdk(): Promise<BtchSdk> {
  if (!sdkPromise) {
    sdkPromise = import('btch-downloader')
      .then(module => module as BtchSdk)
      .catch(error => {
        sdkPromise = undefined;
        throw error;
      });
  }

  return sdkPromise;
}

function sanitizeResponse(response: unknown): Record<string, unknown> {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return { data: response };
  }

  const clean = { ...(response as Record<string, unknown>) };
  delete clean.developer;
  delete clean.note;
  delete clean.issues;
  return clean;
}

function providerFailure(response: unknown): string | undefined {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return undefined;

  const result = response as Record<string, unknown>;
  if (result.status === false) return 'status';

  const nested = result.result;
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return undefined;

  const detail = nested as Record<string, unknown>;
  if (detail.success === false) return 'success';
  if (detail.status === 'error') return 'error';
  if (typeof detail.status === 'number' && detail.status >= 400) return 'http';

  return undefined;
}

class BtchDownloaderService implements IBtchDownloaderService {
  async download(
    platform: BtchDownloadPlatform,
    rawUrl: string | undefined | null
  ): Promise<Record<string, unknown>> {
    const downloader = DOWNLOADERS[platform];
    const url = validateSafeUrl(rawUrl, { platform: downloader.platform, fieldName: 'url' });
    if (activeCalls >= MAX_CONCURRENT_CALLS) {
      throw new DangerError('O serviço de downloads está ocupado. Tente novamente em instantes.', 503);
    }

    try {
      Logger.info(`Executando download de ${downloader.label} via btch-downloader`, 'BtchDownloader');
      const sdk = await loadSdk();
      const run: DownloadMethod = sdk[downloader.method];
      activeCalls += 1;
      const operation = Promise.resolve().then(() => run(url));
      const releaseSlot = () => {
        activeCalls = Math.max(0, activeCalls - 1);
      };
      void operation.then(releaseSlot, releaseSlot);

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutError = new Error('provider deadline');
      let response: unknown;
      try {
        response = await Promise.race([
          operation,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(timeoutError), providerTimeoutMs());
          })
        ]);
      } catch (error) {
        if (error === timeoutError) {
          throw new DangerError('O serviço externo excedeu o tempo limite.', 504);
        }
        throw error;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (providerFailure(response)) {
        throw new DangerError(`Não foi possível obter a mídia de ${downloader.label}.`, 502);
      }

      return sanitizeResponse(response);
    } catch (error) {
      if (error instanceof InvalidParameterError || error instanceof DangerError) throw error;

      Logger.error(`Falha em ${downloader.label}.`, 'BtchDownloader');
      throw new DangerError(`Falha ao consultar o serviço de ${downloader.label}.`, 502);
    }
  }
}

export const btchDownloaderService = new BtchDownloaderService();
