import { DownloadContext, DownloadRequestDTO, DownloadResponseDTO } from '@apptypes/download.type';
import type { MediaType } from '@services/storage.service';

export interface MediaMetadata {
  title?: string;
  duration?: number;
  author?: string;
  thumbnail?: string;
}

export interface ResolvedMedia {
  mediaType: MediaType;
  directUrl: string;
  suggestedExt?: string;
  metadata: MediaMetadata;
}

export interface IDownloaderService {
  processDownload(dto: DownloadRequestDTO, context?: DownloadContext): Promise<DownloadResponseDTO>;
  resolveMediaUrl(dto: DownloadRequestDTO): Promise<ResolvedMedia>;
}
