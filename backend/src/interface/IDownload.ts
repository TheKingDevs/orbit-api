import { DownloadContext, DownloadRequestDTO, DownloadResponseDTO } from '@types/download.type';

export interface IDownloaderService {
  processDownload(dto: DownloadRequestDTO, context?: DownloadContext): Promise<DownloadResponseDTO>;
}
