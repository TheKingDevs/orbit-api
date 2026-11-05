import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';

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

  async saveFromUrl(sourceUrl: string, mediaType: MediaType, suggestedExt?: string): Promise<StoredMedia> {
    this.ensureDirectory();

    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*'
      },
      signal: AbortSignal.timeout(120_000)
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar a mídia (HTTP ${response.status}).`);
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = this.pickExtension(suggestedExt, contentType, sourceUrl, mediaType);
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

    const id = this.createId();
    const outputTemplate = join(this.directory, `${id}.%(ext)s`);
    const ffmpegAvailable = Boolean(Bun.which('ffmpeg'));
    const args = ['yt-dlp', '--no-playlist', '--no-progress', '--print-json'];

    if (type === 'video') {
      if (ffmpegAvailable) {
        args.push(
          '-f', 'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/b',
          '--merge-output-format', 'mp4',
          '--remux-video', 'mp4'
        );
      } else {
        args.push('-f', 'b[acodec!=none][vcodec!=none]/b');
      }
    } else if (ffmpegAvailable) {
      args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'm4a');
    } else {
      args.push('-f', 'bestaudio/best');
    }

    args.push('-o', outputTemplate, url);

    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    const timeout = setTimeout(() => proc.kill(), DOWNLOAD_TIMEOUT_MS);
    timeout.unref?.();

    const output = await new Response(proc.stdout).text();
    const errorOutput = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    const media = this.findByPrefix(id);

    if (exitCode !== 0 || !media) {
      this.removeByPrefix(id);
      throw new Error(errorOutput.trim() || 'Falha ao baixar a mídia.');
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

    return {
      media,
      title: info?.title,
      duration: info?.duration,
      author: info?.uploader || info?.channel
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

      if (!MEDIA_EXTENSIONS.has(extension) && !name.endsWith('.part')) continue;

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
