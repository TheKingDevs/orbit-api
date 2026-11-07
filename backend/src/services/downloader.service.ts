import { IDownloaderService } from '@interface/IDownload';
import { DownloadContext, DownloadRequestDTO, DownloadResponseDTO } from '@types/download.type';
import { WarningError, DangerError } from '@errors/index';
import { Logger } from '@utils/logger';
import { MediaType, StoredMedia, storageService } from '@services/storage.service';

interface MediaMetadata {
  title?: string;
  duration?: number;
  author?: string;
}

interface ResolvedMedia {
  mediaType: MediaType;
  directUrl: string;
  suggestedExt?: string;
  metadata: MediaMetadata;
}

class BaseDownloaderService implements IDownloaderService {
  async processDownload(dto: DownloadRequestDTO, context?: DownloadContext): Promise<DownloadResponseDTO> {
    try {
      const baseUrl = (context?.baseUrl || process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
      const { url, platform, type } = dto;

      let stored: StoredMedia;
      let metadata: MediaMetadata;

      if (type === 'video' || type === 'audio') {
        const pinterestMedia = platform === 'pinterest'
          ? await this.resolvePinterestMedia(url, type)
          : undefined;

        if (pinterestMedia) {
          stored = await storageService.saveFromUrl(
            pinterestMedia.directUrl,
            pinterestMedia.mediaType,
            pinterestMedia.suggestedExt
          );
          metadata = pinterestMedia.metadata;
        } else {
          const downloaded = await storageService.saveWithYtDlp(url, type);
          stored = downloaded.media;
          metadata = {
            title: downloaded.title || `${platform} Media`,
            duration: downloaded.duration || 0,
            author: downloaded.author || platform
          };
        }
      } else {
        const resolved = platform === 'pinterest'
          ? (await this.resolvePinterestMedia(url, type)) || (await this.resolveWithYtDlp(url, type, platform))
          : await this.resolveWithYtDlp(url, type, platform);

        stored = await storageService.saveFromUrl(resolved.directUrl, resolved.mediaType, resolved.suggestedExt);
        metadata = resolved.metadata;
      }

      return {
        success: true,
        message: this.successMessage(stored.mediaType),
        mediaType: stored.mediaType,
        downloadUrl: `${baseUrl}/storage/${stored.filename}`,
        metadata: {
          title: metadata.title || `${platform} Media`,
          duration: metadata.duration || 0,
          author: metadata.author || platform
        }
      };
    } catch (error: any) {
      if (error instanceof WarningError) throw error;
      throw new DangerError(`Falha ao obter mídia: ${error.message}`, 500);
    }
  }

  async resolveMediaUrl(dto: DownloadRequestDTO): Promise<{ directUrl: string; mediaType: MediaType; suggestedExt?: string; metadata: MediaMetadata }> {
    try {
      const { url, type, platform } = dto;

      if (!url) {
        throw new Error('URL é obrigatória para resolução de mídia.');
      }

      const resolved = await this.resolveWithYtDlp(url, type, platform);

      return {
        directUrl: resolved.directUrl,
        mediaType: resolved.mediaType,
        suggestedExt: resolved.suggestedExt,
        metadata: resolved.metadata
      };
    } catch (error: any) {
      if (error instanceof WarningError) throw error;
      throw new DangerError(`Falha ao resolver mídia: ${error.message}`, 500);
    }
  }

  private successMessage(mediaType: MediaType): string {
    if (mediaType === 'video') return 'video baixado com sucesso!';
    if (mediaType === 'audio') return 'áudio baixado com sucesso!';
    if (mediaType === 'gif') return 'gif baixado com sucesso!';
    return 'imagem baixada com sucesso!';
  }

  private async resolvePinterestMedia(url: string, type: string): Promise<ResolvedMedia | undefined> {
    if (type === 'audio') return undefined;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        }
      });

      const html = await res.text();

      if (type === 'video') {
        const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i) ||
                           html.match(/<meta property="og:video:secure_url" content="([^"]+)"/i) ||
                           html.match(/"video_list":\s*\{[^}]*"v720P":\s*\{\s*"url":\s*"([^"]+)"/i);

        if (videoMatch && videoMatch[1]) {
          return {
            mediaType: 'video',
            directUrl: videoMatch[1].replace(/\\/g, ''),
            suggestedExt: 'mp4',
            metadata: { title: 'Pinterest Video', duration: 0, author: 'Pinterest' }
          };
        }

        return undefined;
      }

      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) ||
                         html.match(/<meta name="twitter:image:src" content="([^"]+)"/i) ||
                         html.match(/"images":\s*\{[^}]*"orig":\s*\{\s*"url":\s*"([^"]+)"/i) ||
                         html.match(/https:\/\/i\.pinimg\.com\/[0-9x]+\/[a-f0-9\/]+\.(?:jpg|jpeg|png|gif|webp)/i);

      if (!imageMatch || (!imageMatch[1] && !imageMatch[0])) {
        return undefined;
      }

      let imageUrl = (imageMatch[1] || imageMatch[0]).replace(/\\/g, '');
      imageUrl = imageUrl
        .replace(/\/236x\//g, '/originals/')
        .replace(/\/474x\//g, '/originals/')
        .replace(/\/564x\//g, '/originals/')
        .replace(/\/736x\//g, '/originals/');

      const isGif = type === 'gif' || imageUrl.toLowerCase().endsWith('.gif');

      return {
        mediaType: isGif ? 'gif' : 'image',
        directUrl: imageUrl,
        suggestedExt: isGif ? 'gif' : undefined,
        metadata: { title: 'Pinterest Media', duration: 0, author: 'Pinterest' }
      };
    } catch (err: any) {
      Logger.warning(`Scraper do Pinterest falhou (${err.message}), tentando fallback yt-dlp.`, 'PinterestDownloader');
      return undefined;
    }
  }

  private async resolveWithYtDlp(url: string, type: string, platform: string): Promise<ResolvedMedia> {
    const args = ['yt-dlp', '--dump-json', '--no-playlist'];

    if (type === 'audio') {
      args.push('-f', 'bestaudio/best');
    } else if (type === 'video') {
      args.push('-f', 'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/b');
    }

    args.push(url);

    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    const output = await new Response(proc.stdout).text();
    const errorOutput = await new Response(proc.stderr).text();

    if (proc.exitCode !== 0 && !output) {
      throw new Error(errorOutput || 'Não foi possível extrair a mídia do link informado.');
    }

    const info = JSON.parse(output);
    const formats: any[] = Array.isArray(info.formats) ? info.formats : [];
    const directUrl = info.url || formats.find(format => format.url)?.url || info.thumbnail;

    if (!directUrl) {
      throw new Error('Não foi possível obter a URL de mídia.');
    }

    const ext = String(info.ext || '').toLowerCase();
    let mediaType: MediaType;

    if (type === 'gif' || ext === 'gif') {
      mediaType = 'gif';
    } else if (type === 'image') {
      mediaType = 'image';
    } else if (type === 'video') {
      mediaType = 'video';
    } else if (type === 'audio') {
      mediaType = 'audio';
    } else if (['mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
      mediaType = 'video';
    } else if (['mp3', 'm4a', 'opus', 'ogg', 'oga'].includes(ext)) {
      mediaType = 'audio';
    } else {
      mediaType = 'image';
    }

    return {
      mediaType,
      directUrl,
      suggestedExt: ext || undefined,
      metadata: {
        title: info.title || `${platform} Media`,
        duration: info.duration || 0,
        author: info.uploader || info.channel || platform
      }
    };
  }
}

export class DownloaderService implements IDownloaderService {
  private target: BaseDownloaderService;

  constructor() {
    this.target = new BaseDownloaderService();

    return new Proxy(this, {
      get(serviceTarget, prop, receiver) {
        if (prop === 'processDownload') {
          return async (dto: DownloadRequestDTO, context?: DownloadContext) => {
            const startTime = performance.now();
            Logger.info(`Processando download: ${dto.platform} (${dto.type})`, 'DownloaderService');

            const result = await serviceTarget.target.processDownload(dto, context);

            const duration = (performance.now() - startTime).toFixed(2);
            Logger.success(`Download concluído em ${duration}ms`, 'DownloaderService');
            return result;
          };
        }
        return Reflect.get(serviceTarget, prop, receiver);
      }
    });
  }

  async processDownload(dto: DownloadRequestDTO, context?: DownloadContext): Promise<DownloadResponseDTO> {
    return this.target.processDownload(dto, context);
  }
}
