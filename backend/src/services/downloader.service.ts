import { IDownloaderService } from '@interface/IDownload';
import { DownloadContext, DownloadRequestDTO, DownloadResponseDTO } from '@types/download.type';
import { WarningError, DangerError } from '@errors/index';
import { Logger } from '@utils/logger';
import { MediaType, StoredMedia, storageService } from '@services/storage.service';
import { validateSafeUrl, TrustedPlatform } from '@utils/urlSecurity.util';
import { devWorldBRService } from '@services/devworldbr.service';

interface MediaMetadata {
  title?: string;
  duration?: number;
  author?: string;
  thumbnail?: string;
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
      const { url, name, platform, type } = dto;

      if (url) validateSafeUrl(url, { platform: platform as TrustedPlatform, fieldName: 'url' });

      let stored: StoredMedia;
      let metadata: MediaMetadata;

      if (type === 'video' || type === 'audio') {
        if (platform === 'youtube' && name?.trim()) {
          const search: any = await devWorldBRService.ytSearch(name.trim().slice(0, 500));
          const entries = Array.isArray(search.data) ? search.data : Array.isArray(search.results) ? search.results : [];
          const item = entries.find((entry: any) => entry?.tipo !== 'live' && (entry?.link || entry?.url));
          const videoUrl = item?.link || item?.url;
          if (!videoUrl) throw new WarningError('Não foi possível encontrar o vídeo para o nome informado.', 404);

          const mediaType: MediaType = type === 'audio' ? 'audio' : 'video';
          const sourceUrl = devWorldBRService.youtubeMediaSource(videoUrl, mediaType);
          const downloaded = await this.saveYouTubeMedia(sourceUrl, mediaType, mediaType === 'audio' ? 'mp3' : 'mp4');
          const title = item?.titulo || item?.title || name.trim();
          const thumbnail = item?.imagen || item?.thumbnail;
          const author = item?.autor?.nome || item?.canal || item?.author || 'YouTube';
          const duration = this.parseDuration(item?.duracao) || Number(item?.segundos) || 0;

          return {
            success: true,
            message: this.successMessage(mediaType),
            mediaType,
            downloadUrl: `${baseUrl}/storage/${downloaded.filename}`,
            thumbnail,
            metadata: { title, duration, author, thumbnail }
          };
        }

        if (platform === 'tiktok') {
          const tikwmMedia = await this.resolveTikTokMedia(url || '', type);
          if (!tikwmMedia) throw new WarningError('Não foi possível baixar este vídeo do TikTok agora. Tente novamente mais tarde ou use outro link público.', 502);
          stored = await storageService.saveFromUrl(tikwmMedia.directUrl, tikwmMedia.mediaType, tikwmMedia.suggestedExt, {
            Referer: 'https://www.tikwm.com/', Origin: 'https://www.tikwm.com'
          });
          metadata = tikwmMedia.metadata;

          return {
            success: true,
            message: this.successMessage(stored.mediaType),
            mediaType: stored.mediaType,
            downloadUrl: `${baseUrl}/storage/${stored.filename}`,
            thumbnail: metadata.thumbnail,
            metadata: {
              title: metadata.title || 'TikTok Media',
              duration: metadata.duration || 0,
              author: metadata.author || 'TikTok',
              thumbnail: metadata.thumbnail
            }
          };
        }

        const pinterestMedia = platform === 'pinterest'
          ? await this.resolvePinterestMedia(url, type)
          : undefined;
        const resolved = pinterestMedia ?? await this.resolveWithDevWorld(url || '', type, platform);
        const storedMedia = platform === 'youtube'
          ? await this.saveYouTubeMedia(resolved.directUrl, resolved.mediaType, resolved.suggestedExt || (resolved.mediaType === 'audio' ? 'mp3' : 'mp4'))
          : await storageService.registerRemote(resolved.directUrl, resolved.mediaType, resolved.suggestedExt);
        return {
          success: true,
          message: this.successMessage(resolved.mediaType),
          mediaType: resolved.mediaType,
          downloadUrl: `${baseUrl}/storage/${storedMedia.filename}`,
          thumbnail: resolved.metadata.thumbnail,
          metadata: {
            title: resolved.metadata.title || `${platform} Media`,
            duration: resolved.metadata.duration || 0,
            author: resolved.metadata.author || platform,
            thumbnail: resolved.metadata.thumbnail
          }
        };
      } else {
        const resolved = platform === 'pinterest'
          ? (await this.resolvePinterestMedia(url || '', type)) || (await this.resolveWithDevWorld(url || '', type, platform))
          : await this.resolveWithDevWorld(url || '', type, platform);

        stored = await storageService.saveFromUrl(resolved.directUrl, resolved.mediaType, resolved.suggestedExt);
        metadata = resolved.metadata;
      }

      return {
        success: true,
        message: this.successMessage(stored.mediaType),
        mediaType: stored.mediaType,
        downloadUrl: `${baseUrl}/storage/${stored.filename}`,
        thumbnail: metadata.thumbnail,
        metadata: {
          title: metadata.title || `${platform} Media`,
          duration: metadata.duration || 0,
          author: metadata.author || platform,
          thumbnail: metadata.thumbnail
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

      validateSafeUrl(url, { platform: platform as TrustedPlatform, fieldName: 'url' });

      const resolved = await this.resolveWithDevWorld(url, type, platform);

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
    if (mediaType === 'video') return 'link do vídeo pronto para baixar!';
    if (mediaType === 'audio') return 'link do áudio pronto para baixar!';
    if (mediaType === 'gif') return 'gif baixado com sucesso!';
    return 'imagem baixada com sucesso!';
  }

  private parseDuration(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const parts = value.split(':').map(Number);
    return parts.every(Number.isFinite) ? parts.reduce((total, part) => total * 60 + part, 0) : 0;
  }

  private async resolvePinterestMedia(url: string, type: string): Promise<ResolvedMedia | undefined> {
    if (type === 'audio') return undefined;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(8_000)
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
      Logger.warning('Scraper do Pinterest falhou.', 'PinterestDownloader');
      return undefined;
    }
  }

  private async resolveTikTokMedia(url: string, type: string): Promise<ResolvedMedia | undefined> {
    try {
      if (/^https?:\/\/(?:vm|vt)\.tiktok\.com\//i.test(url)) {
        await new Promise(resolve => setTimeout(resolve, 3_000));
      }
      const res = await fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.tikwm.com/',
          'Origin': 'https://www.tikwm.com'
        },
        body: new URLSearchParams({ url, hd: '1' }),
        signal: AbortSignal.timeout(8_000)
      });
      const json = (await res.json()) as any;
      if (json.code === 0 && json.data) {
        const cover = json.data.cover || json.data.origin_cover || json.data.music_info?.cover;
        if (type === 'audio') {
          return {
            mediaType: 'audio',
            directUrl: json.data.music,
            suggestedExt: 'mp3',
            metadata: {
              title: json.data.music_info?.title || json.data.title || 'TikTok Audio',
              duration: json.data.music_info?.duration || json.data.duration || 0,
              author: json.data.music_info?.author || json.data.author?.nickname || 'TikTok',
              thumbnail: cover
            }
          };
        }

        const videoUrl = json.data.play || json.data.wmplay;
        if (videoUrl) {
          return {
            mediaType: 'video',
            directUrl: videoUrl,
            suggestedExt: 'mp4',
            metadata: {
              title: json.data.title || 'TikTok Video',
              duration: json.data.duration || 0,
              author: json.data.author?.nickname || 'TikTok',
              thumbnail: cover
            }
          };
        }
      }
    } catch (err: any) {
      Logger.warning(`Fallback TikWM falhou (${err.message})`, 'TikTokDownloader');
    }
    return undefined;
  }

  private async fetchYouTubeMetadata(url: string): Promise<MediaMetadata> {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) return {};
      const data = await response.json() as any;
      return {
        title: typeof data.title === 'string' ? data.title : undefined,
        author: typeof data.author_name === 'string' ? data.author_name : 'YouTube',
        thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined
      };
    } catch {
      return {};
    }
  }

  private async saveYouTubeMedia(sourceUrl: string, mediaType: MediaType, suggestedExt: string): Promise<StoredMedia> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await storageService.saveFromUrl(sourceUrl, mediaType, suggestedExt, {}, 300_000);
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
      }
    }

    Logger.warning(`Falha ao baixar mídia do YouTube após 3 tentativas: ${lastError instanceof Error ? lastError.message : String(lastError)}`, 'YouTubeDownloader');
    throw new WarningError('Não foi possível baixar a mídia do YouTube. Tente novamente em instantes.', 502);
  }

  private async resolveWithDevWorld(url: string, type: string, platform: string): Promise<ResolvedMedia> {
    if (platform === 'youtube') {
      const mediaType: MediaType = type === 'audio' ? 'audio' : 'video';
      const directUrl = devWorldBRService.youtubeMediaSource(url, mediaType);
      const metadata = await this.fetchYouTubeMetadata(url);
      return { mediaType, directUrl, suggestedExt: mediaType === 'audio' ? 'mp3' : 'mp4', metadata };
    }
    if (platform === 'instagram') {
      const response: any = await devWorldBRService.instagram(url);
      const seen = new Set<object>();
      const find = (value: any, depth = 0): string | undefined => {
        if (!value || typeof value !== 'object' || depth > 6 || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) { for (const x of value) { const found = find(x, depth + 1); if (found) return found; } return; }
        for (const [key, x] of Object.entries(value)) {
          if (typeof x === 'string' && /^https:\/\//i.test(x) && ((type === 'video' && (/video|download/i.test(key) || /\.mp4(?:[?#]|$)/i.test(x))) || (type !== 'video' && (/image|photo|download/i.test(key) || /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(x))))) return x;
          const found = find(x, depth + 1); if (found) return found;
        }
      };
      const directUrl = find(response);
      if (!directUrl) throw new WarningError('Não foi possível obter a mídia do Instagram.', 502);
      return { mediaType: type === 'video' ? 'video' : 'image', directUrl, suggestedExt: type === 'video' ? 'mp4' : undefined, metadata: { title: 'Instagram Media', author: 'Instagram' } };
    }
    throw new WarningError('Esta mídia não está disponível pelo serviço de download.', 502);
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
        if (prop === 'resolveMediaUrl') {
          return (dto: DownloadRequestDTO) => serviceTarget.target.resolveMediaUrl(dto);
        }
        if (prop in serviceTarget.target && !(prop in serviceTarget)) {
          return Reflect.get(serviceTarget.target, prop);
        }
        return Reflect.get(serviceTarget, prop, receiver);
      }
    });
  }

  async processDownload(dto: DownloadRequestDTO, context?: DownloadContext): Promise<DownloadResponseDTO> {
    return this.target.processDownload(dto, context);
  }

  async resolveMediaUrl(dto: DownloadRequestDTO): Promise<{ directUrl: string; mediaType: MediaType; suggestedExt?: string; metadata: MediaMetadata }> {
    return this.target.resolveMediaUrl(dto);
  }
}
