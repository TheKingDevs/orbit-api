import type { BtchDownloadPlatform } from '@types/download.type';

export interface IBtchDownloaderService {
  download(
    platform: BtchDownloadPlatform,
    rawUrl: string | undefined | null
  ): Promise<Record<string, unknown>>;
}
