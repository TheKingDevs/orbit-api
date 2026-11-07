import { DownloadContext, DownloadRequestDTO, DownloadResponseDTO } from '@types/download.type';

export interface IDownloaderService {
  processDownload(dto: DownloadRequestDTO, context?: DownloadContext): Promise<DownloadResponseDTO>;
  resolveMediaUrl(dto: DownloadRequestDTO): Promise<{ directUrl: string; mediaType: MediaType; suggestedExt?: string; metadata: MediaMetadata }>;
}
