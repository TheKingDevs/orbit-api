import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { validateSafeUrl } from '@utils/urlSecurity.util';
import { WarningError } from '@errors/index';
import { isYtDlpSearchQuery, ytDlpRuntimeArgs } from '@utils/ytDlp.util';

export type MediaType = 'video' | 'audio' | 'image' | 'gif';

export interface StoredMedia {
  filename: string;
  path: string;
  extension: string;
  mediaType: MediaType;
}

export interface YtDlpDownloadResult {
  media: StoredMedia;
  title?: string;
  duration?: number;
  author?: string;
  thumbnail?: string;
}

export interface RemoteMediaReference {
  url: string;
  mediaType: MediaType;
}

const STORAGE_TTL_MS = 30 * 60 * 1000;
const STORAGE_DIR = resolve(process.cwd(), 'storage');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

const MEDIA_EXTENSIONS = new Set([
  'mp4', 'webm', 'mkv', 'mov',
  'mp3', 'm4a', 'opus', 'ogg', 'oga',
  'jpg', 'jpeg', 'png', 'webp', 'gif'
]);

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  opus: 'audio/opus',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
};

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/opus': 'opus',
  'audio/ogg': 'ogg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

class StorageService {
  readonly directory = STORAGE_DIR;

  constructor() {
    this.ensureDirectory();
    this.cleanupExpired();
  }

  createId(): string {
    return randomUUID().replace(/-/g, '');
  }

  resolveFile(filename: string): string | undefined {
    if (!/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(filename)) return undefined;

    const extension = extname(filename).slice(1).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(extension)) return undefined;

    return join(this.directory, filename);
  }

  getContentType(filename: string): string {
    const extension = extname(filename).slice(1).toLowerCase();
    return CONTENT_TYPES[extension] || 'application/octet-stream';
  }

  async registerRemote(sourceUrl: string, mediaType: MediaType, suggestedExt?: string): Promise<StoredMedia> {
    this.ensureDirectory();
    const safeUrl = validateSafeUrl(sourceUrl);
    const extension = this.pickExtension(suggestedExt, '', safeUrl, mediaType);
    const filename = `${this.createId()}.${extension}`;
    const filePath = join(this.directory, filename);
    const referencePath = `${filePath}.ref`;
    await Bun.write(referencePath, JSON.stringify({ url: safeUrl, mediaType }));
    this.scheduleCleanup(referencePath);

    return { filename, path: filePath, extension, mediaType };
  }

  async resolveRemote(filename: string): Promise<RemoteMediaReference | undefined> {
    const filePath = this.resolveFile(filename);
    if (!filePath) return undefined;

    const referenceFile = Bun.file(`${filePath}.ref`);
    if (!(await referenceFile.exists())) return undefined;

    try {
      const reference = await referenceFile.json() as Partial<RemoteMediaReference>;
      if (typeof reference.url !== 'string') return undefined;
      const mediaType = reference.mediaType;
      if (!mediaType || !['video', 'audio', 'image', 'gif'].includes(mediaType)) return undefined;
      return { url: validateSafeUrl(reference.url), mediaType };
    } catch {
      return undefined;
    }
  }

  scheduleCleanup(filePath: string, ttlMs: number = STORAGE_TTL_MS): void {
    const timer = setTimeout(() => this.remove(filePath), ttlMs);
    timer.unref?.();
  }

  remove(filePath: string): void {
    try {
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch {
      // Arquivo pode já ter sido removido por outra limpeza.
    }
  }

  removeByPrefix(prefix: string): void {
    if (!existsSync(this.directory)) return;

    for (const name of readdirSync(this.directory)) {
      if (!name.startsWith(prefix)) continue;
      this.remove(join(this.directory, name));
    }
  }

  findByPrefix(prefix: string): StoredMedia | undefined {
    if (!existsSync(this.directory)) return undefined;

    const matches = readdirSync(this.directory)
      .filter(name => {
        if (!name.startsWith(prefix) || name.endsWith('.part')) return false;
        const extension = extname(name).slice(1).toLowerCase();
        return MEDIA_EXTENSIONS.has(extension);
      })
      .map(name => {
        const path = join(this.directory, name);
        let mtimeMs = 0;

        try {
          mtimeMs = statSync(path).mtimeMs;
        } catch {
          mtimeMs = 0;
        }

        return { name, path, mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const match = matches[0];
    if (!match) return undefined;

    const extension = extname(match.name).slice(1).toLowerCase();
    return {
      filename: match.name,
      path: match.path,
      extension,
      mediaType: this.mediaTypeFromExtension(extension)
    };
  }

  async saveFromUrl(
    sourceUrl: string,
    mediaType: MediaType,
    suggestedExt?: string,
    requestHeaders: Record<string, string> = {}
  ): Promise<StoredMedia> {
    this.ensureDirectory();
    const safeUrl = validateSafeUrl(sourceUrl);

    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        ...requestHeaders
      },
      signal: AbortSignal.timeout(120_000)
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar a mídia (HTTP ${response.status}).`);
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (
      ['video', 'audio'].includes(mediaType) &&
      (contentType.startsWith('text/') || contentType === 'application/json' || contentType.endsWith('+json'))
    ) {
      await response.body?.cancel();
      throw new Error(`A origem retornou ${contentType || 'conteúdo inválido'} em vez de um arquivo de mídia.`);
    }
    const extension = this.pickExtension(suggestedExt, contentType, safeUrl, mediaType);
    const id = this.createId();
    const filename = `${id}.${extension}`;
    const filePath = join(this.directory, filename);

    await Bun.write(filePath, response);
    this.scheduleCleanup(filePath);

    return {
      filename,
      path: filePath,
      extension,
      mediaType: this.mediaTypeFromExtension(extension, mediaType)
    };
  }

  async saveWithYtDlp(url: string, type: 'video' | 'audio'): Promise<YtDlpDownloadResult> {
    this.ensureDirectory();
    const isSearch = isYtDlpSearchQuery(url);

    const id = this.createId();
    const outputTemplate = join(this.directory, `${id}.%(ext)s`);
    const ffmpegAvailable = Boolean(Bun.which('ffmpeg'));
    const args = [
      'yt-dlp', ...ytDlpRuntimeArgs(), ...(isSearch ? ['--ignore-errors', '--playlist-end', '5', '--max-downloads', '1'] : ['--no-playlist']), '--no-progress', '--output-na-placeholder', 'null', '--print',
      '{"title":%(title)j,"duration":%(duration)j,"uploader":%(uploader)j,"thumbnail":%(thumbnail)j,"ext":%(ext)j}'
    ];
    if (/tiktok\.com/i.test(url)) {
      args.push('--referer', 'https://www.tiktok.com/', '--user-agent', USER_AGENT);
      const cookiesFile = process.env.TIKTOK_COOKIES_FILE?.trim();
      if (cookiesFile && existsSync(cookiesFile)) args.push('--cookies', cookiesFile);
    }

    if (type === 'video') {
      if (ffmpegAvailable) {
        args.push(
          '-f', 'bv*[height<=1080][vcodec^=avc1]+ba[acodec^=mp4a]/bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b',
          '--merge-output-format', 'mp4',
          '--remux-video', 'mp4'
        );
      } else {
        args.push('-f', 'b[height<=1080][acodec!=none][vcodec!=none]/b');
      }
    } else {
      args.push('-f', 'bestaudio[ext=m4a]/bestaudio/best');
    }

    const safeUrl = isYtDlpSearchQuery(url) ? url : validateSafeUrl(url);
    args.push('-o', outputTemplate, safeUrl);

    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, DOWNLOAD_TIMEOUT_MS);
    timeout.unref?.();

    const [output, errorOutput] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ]);
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    const media = this.findByPrefix(id);

    if (exitCode !== 0 || !media) {
      this.removeByPrefix(id);
      throw new WarningError(
        timedOut
          ? 'O download excedeu o tempo limite. Tente novamente.'
          : errorOutput.trim() || (exitCode === 0 ? 'O extrator terminou sem gerar um arquivo de mídia.' : 'Falha ao baixar a mídia.'),
        timedOut ? 504 : 502
      );
    }

    media.mediaType = type;
    this.scheduleCleanup(media.path);

    return this.buildYtDlpResult(media, output);
  }

  private buildYtDlpResult(media: StoredMedia, output: string): YtDlpDownloadResult {
    let info: any;

    try {
      info = JSON.parse(output.trim());
    } catch {
      const lines = output.split('\n').filter(line => line.trim().startsWith('{'));

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          info = JSON.parse(lines[i]);
          break;
        } catch {
          continue;
        }
      }
    }

    let thumbnail = info?.thumbnail;
    if (!thumbnail && Array.isArray(info?.thumbnails) && info.thumbnails.length > 0) {
      thumbnail = info.thumbnails[info.thumbnails.length - 1]?.url;
    }
    if (!thumbnail && info?.id) {
      thumbnail = `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`;
    }

    return {
      media,
      title: info?.title,
      duration: info?.duration,
      author: info?.uploader || info?.channel,
      thumbnail
    };
  }

  private pickExtension(suggestedExt: string | undefined, contentType: string, sourceUrl: string, mediaType: MediaType): string {
    const fromContentType = EXT_BY_CONTENT_TYPE[contentType];
    if (fromContentType) return fromContentType;

    const normalizedSuggested = suggestedExt?.toLowerCase().replace(/^\./, '');
    if (normalizedSuggested && MEDIA_EXTENSIONS.has(normalizedSuggested)) {
      return normalizedSuggested === 'jpeg' ? 'jpg' : normalizedSuggested;
    }

    const fromUrl = this.extensionFromUrl(sourceUrl);
    if (fromUrl) return fromUrl;

    if (mediaType === 'video') return 'mp4';
    if (mediaType === 'audio') return 'mp3';
    if (mediaType === 'gif') return 'gif';

    return 'jpg';
  }

  private extensionFromUrl(sourceUrl: string): string | undefined {
    try {
      const extension = extname(new URL(sourceUrl).pathname).slice(1).toLowerCase();
      if (!MEDIA_EXTENSIONS.has(extension)) return undefined;
      return extension === 'jpeg' ? 'jpg' : extension;
    } catch {
      return undefined;
    }
  }

  private mediaTypeFromExtension(extension: string, fallback?: MediaType): MediaType {
    if (['mp4', 'webm', 'mkv', 'mov'].includes(extension)) return 'video';
    if (['mp3', 'm4a', 'opus', 'ogg', 'oga'].includes(extension)) return 'audio';
    if (extension === 'gif') return 'gif';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
    return fallback || 'image';
  }

  private ensureDirectory(): void {
    if (!existsSync(this.directory)) {
      mkdirSync(this.directory, { recursive: true });
    }
  }

  private cleanupExpired(): void {
    if (!existsSync(this.directory)) return;

    const now = Date.now();

    for (const name of readdirSync(this.directory)) {
      const extension = extname(name).slice(1).toLowerCase();

      if (!MEDIA_EXTENSIONS.has(extension) && !name.endsWith('.part') && !name.endsWith('.ref')) continue;

      const filePath = join(this.directory, name);

      try {
        const info = statSync(filePath);

        if (info.isFile() && now - info.mtimeMs > STORAGE_TTL_MS) {
          unlinkSync(filePath);
        }
      } catch {
        continue;
      }
    }
  }
}

export const storageService = new StorageService();
