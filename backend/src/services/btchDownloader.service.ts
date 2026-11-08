import { capcut, gdrive, spotify, threads, twitter } from 'btch-downloader';
import { DangerError, InvalidParameterError } from '@errors/index';
import { Logger } from '@utils/logger';
import { validateSafeUrl } from '@utils/urlSecurity.util';
import type { TrustedPlatform } from '@utils/urlSecurity.util';

export type BtchDownloadPlatform = 'spotify' | 'threads' | 'google-drive' | 'capcut' | 'twitter';
type DownloadMethod = (url: string) => Promise<unknown>;

const DOWNLOADERS: Record<BtchDownloadPlatform, { label: string; platform: TrustedPlatform; run: DownloadMethod }> = {
  spotify: { label: 'Spotify', platform: 'spotify', run: spotify },
  threads: { label: 'Threads', platform: 'threads', run: threads },
  'google-drive': { label: 'Google Drive', platform: 'google-drive', run: gdrive },
  capcut: { label: 'CapCut', platform: 'capcut', run: capcut },
  twitter: { label: 'Twitter/X', platform: 'twitter', run: twitter }
};

function sanitizeResponse(response: unknown): unknown {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return { data: response };
  }

  const clean = { ...(response as Record<string, unknown>) };
  delete clean.developer;
  delete clean.note;
  delete clean.issues;
  return clean;
}

class BtchDownloaderService {
  async download(platform: BtchDownloadPlatform, rawUrl: string | undefined | null): Promise<unknown> {
    const downloader = DOWNLOADERS[platform];
    const url = validateSafeUrl(rawUrl, { platform: downloader.platform, fieldName: 'url' });

    try {
      Logger.info(`Executando download de ${downloader.label} via btch-downloader`, 'BtchDownloader');
      const response = await downloader.run(url);

      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const result = response as Record<string, unknown>;
        if (result.status === false) {
          throw new DangerError(`Não foi possível obter a mídia de ${downloader.label}.`, 502);
        }
      }

      return sanitizeResponse(response);
    } catch (error) {
      if (error instanceof InvalidParameterError || error instanceof DangerError) throw error;

      const detail = error instanceof Error ? error.message : String(error);
      Logger.error(`Falha em ${downloader.label}: ${detail}`, 'BtchDownloader');
      throw new DangerError(`Falha ao consultar o serviço de ${downloader.label}.`, 502);
    }
  }
}

export const btchDownloaderService = new BtchDownloaderService();
