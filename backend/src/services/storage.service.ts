import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { validateSafeUrl } from '@utils/urlSecurity.util';
import { WarningError } from '@errors/index';

export type MediaType = 'video' | 'audio' | 'image' | 'gif';

export interface StoredMedia {
  filename: string;
  path: string;
  extension: string;
  mediaType: MediaType;
}

export interface RemoteMediaReference {
  url: string;
  mediaType: MediaType;
}

const STORAGE_TTL_MS = 30 * 60 * 1000;
const STORAGE_DIR = resolve(process.cwd(), 'storage');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

  async saveFromUrl(
    sourceUrl: string,
    mediaType: MediaType,
    suggestedExt?: string,
    requestHeaders: Record<string, string> = {},
    timeoutMs: number = 120_000
  ): Promise<StoredMedia> {
    this.ensureDirectory();
    const safeUrl = validateSafeUrl(sourceUrl);

    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        ...requestHeaders
      },
      signal: AbortSignal.timeout(timeoutMs)
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
