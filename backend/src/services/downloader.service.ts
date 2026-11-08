import { IDownloaderService } from '@interface/IDownload';
import { DownloadContext, DownloadRequestDTO, DownloadResponseDTO } from '@types/download.type';
import { WarningError, DangerError } from '@errors/index';
import { Logger } from '@utils/logger';
import { MediaType, StoredMedia, storageService } from '@services/storage.service';
import { validateSafeUrl, TrustedPlatform } from '@utils/urlSecurity.util';
import { isYtDlpSearchQuery, ytDlpRuntimeArgs } from '@utils/ytDlp.util';

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
      const { url, platform, type } = dto;

      const searchQuery = Boolean(url && platform === 'youtube' && isYtDlpSearchQuery(url));
      if (url && !searchQuery) {
        validateSafeUrl(url, { platform: platform as TrustedPlatform, fieldName: 'url' });
      }

      let stored: StoredMedia;
      let metadata: MediaMetadata;

      if (type === 'video' || type === 'audio') {
        if (platform === 'tiktok') {
          try {
            const downloaded = await storageService.saveWithYtDlp(url || '', type);
            stored = downloaded.media;
            metadata = {
              title: downloaded.title || 'TikTok Media',
              duration: downloaded.duration || 0,
              author: downloaded.author || 'TikTok',
              thumbnail: downloaded.thumbnail
            };
          } catch (ytDlpError) {
            Logger.warning(`Download via yt-dlp falhou (${ytDlpError instanceof Error ? ytDlpError.message : String(ytDlpError)}); tentando TikWM.`, 'TikTokDownloader');
            const tikwmMedia = await this.resolveTikTokMedia(url || '', type);
            if (!tikwmMedia) throw ytDlpError;
            try {
              stored = await storageService.saveFromUrl(
                tikwmMedia.directUrl,
                tikwmMedia.mediaType,
                tikwmMedia.suggestedExt,
                { Referer: 'https://www.tikwm.com/', Origin: 'https://www.tikwm.com' }
              );
              metadata = tikwmMedia.metadata;
            } catch (tikwmError) {
              Logger.warning(`Download via TikWM falhou (${tikwmError instanceof Error ? tikwmError.message : String(tikwmError)}).`, 'TikTokDownloader');
              throw new WarningError('Não foi possível baixar este vídeo do TikTok agora. Tente novamente mais tarde ou use outro link público.', 502);
            }
          }

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
        let resolved: ResolvedMedia;
        try {
          resolved = pinterestMedia ?? await this.resolveWithYtDlp(url, type, platform);
        } catch (resolutionError) {
          const errorMessage = resolutionError instanceof Error ? resolutionError.message : String(resolutionError);
          const youtubeUrl = Boolean(url && /(?:youtube\.com|youtu\.be)/i.test(url));
          if (type !== 'video' || !(platform === 'youtube' || youtubeUrl) || !/requested format is not available/i.test(errorMessage)) {
            throw resolutionError;
          }

          const downloaded = await storageService.saveWithYtDlp(url, 'video');
          const metadata = {
            title: downloaded.title || 'YouTube Video',
            duration: downloaded.duration || 0,
            author: downloaded.author || 'YouTube',
            thumbnail: downloaded.thumbnail
          };
          return {
            success: true,
            message: this.successMessage('video'),
            mediaType: 'video',
            downloadUrl: `${baseUrl}/storage/${downloaded.media.filename}`,
            thumbnail: metadata.thumbnail,
            metadata
          };
        }
        const reference = await storageService.registerRemote(resolved.directUrl, resolved.mediaType, resolved.suggestedExt);
        return {
          success: true,
          message: this.successMessage(resolved.mediaType),
          mediaType: resolved.mediaType,
          downloadUrl: `${baseUrl}/storage/${reference.filename}`,
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
    if (mediaType === 'video') return 'link do vídeo pronto para baixar!';
    if (mediaType === 'audio') return 'link do áudio pronto para baixar!';
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
      Logger.warning(`Scraper do Pinterest falhou (${err.message}), tentando fallback yt-dlp.`, 'PinterestDownloader');
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

  private async resolveWithYtDlp(url: string, type: string, platform: string): Promise<ResolvedMedia> {
    const isSearch = isYtDlpSearchQuery(url);
    const args = [
      'yt-dlp', ...ytDlpRuntimeArgs(), '--skip-download', '--no-warnings', ...(isSearch ? ['--ignore-errors', '--playlist-end', '5'] : ['--no-playlist']), '--no-check-formats',
      '--socket-timeout', '20', '--output-na-placeholder', 'null', '--print',
      '{"url":%(url)j,"title":%(title)j,"duration":%(duration)j,"uploader":%(uploader)j,"thumbnail":%(thumbnail)j,"ext":%(ext)j}'
    ];

    if (type === 'audio') {
      args.push('-f', 'bestaudio/best');
    } else if (type === 'video') {
      const videoFormat = platform === 'youtube'
        ? 'b[height<=1080][acodec!=none][vcodec!=none]/b[acodec!=none][vcodec!=none]'
        : 'best';
      args.push('-f', videoFormat);
    }

    args.push(url);

    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, 45_000);
    timeout.unref?.();
    const [output, errorOutput] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ]);
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    if (timedOut) {
      throw new WarningError('A plataforma de origem demorou para responder. Tente novamente em instantes.', 504);
    }

    if (exitCode !== 0 && !output) {
      if (platform === 'tiktok' || url.includes('tiktok.com')) {
        const fallback = await this.resolveTikTokMedia(url, type);
        if (fallback) return fallback;
      }
      throw new WarningError(errorOutput || 'Não foi possível extrair a mídia do link informado.', 502);
    }

    let info: Record<string, unknown>;
    try {
      info = JSON.parse(output.trim().split('\n').filter(Boolean)[0] || '{}');
    } catch {
      throw new WarningError('A plataforma não retornou os dados da mídia em um formato válido.', 502);
    }
    const directUrl = typeof info.url === 'string' ? info.url : undefined;

    if (!directUrl) {
      throw new WarningError('Não foi possível obter a URL de mídia.', 502);
    }

    let thumb = typeof info.thumbnail === 'string' ? info.thumbnail : undefined;
    if (!thumb && (platform === 'youtube' || url.includes('youtu'))) {
      const ytMatch = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/i);
      if (ytMatch) thumb = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }

    const ext = String(info.ext || '').toLowerCase();
    const title = typeof info.title === 'string' ? info.title : `${platform} Media`;
    const author = typeof info.uploader === 'string'
      ? info.uploader
      : typeof info.channel === 'string'
        ? info.channel
        : platform;
    const duration = typeof info.duration === 'number' ? info.duration : 0;
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
        title,
        duration,
        author,
        thumbnail: thumb
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
