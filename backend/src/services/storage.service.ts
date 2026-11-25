import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { fetchSafeUrl, validateSafeUrl } from '@utils/urlSecurity.util';
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
  provider?: 'tikwm';
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

  async registerRemote(
    sourceUrl: string,
    mediaType: MediaType,
    suggestedExt?: string,
    provider?: RemoteMediaReference['provider']
  ): Promise<StoredMedia> {
    this.ensureDirectory();
    const safeUrl = validateSafeUrl(sourceUrl);
    const extension = this.pickExtension(suggestedExt, '', safeUrl, mediaType);
    const filename = `${this.createId()}.${extension}`;
    const filePath = join(this.directory, filename);
    const referencePath = `${filePath}.ref`;
    await Bun.write(referencePath, JSON.stringify({ url: safeUrl, mediaType, ...(provider ? { provider } : {}) }));
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
      const provider = reference.provider === 'tikwm' ? 'tikwm' : undefined;
      return { url: validateSafeUrl(reference.url), mediaType, ...(provider ? { provider } : {}) };
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
    const maxBytes = this.getMaxDownloadBytes(mediaType);
    const contentLength = 0;

    const response = await fetchSafeUrl(safeUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        ...requestHeaders
      },
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Falha ao baixar a mídia (HTTP ${response.status}).`);
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`A mídia excede o limite permitido de ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (
      ['video', 'audio'].includes(mediaType) &&
      (contentType.startsWith('text/') || contentType === 'application/json' || contentType.endsWith('+json'))
    ) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`A origem retornou ${contentType || 'conteúdo inválido'} em vez de um arquivo de mídia.`);
    }
    const extension = this.pickExtension(suggestedExt, contentType, safeUrl, mediaType);
    const id = this.createId();
    const filename = `${id}.${extension}`;
    const filePath = join(this.directory, filename);

    try {
      await this.writeResponseToFile(response, filePath, maxBytes);
    } catch (error) {
      this.remove(filePath);
      throw error;
    }

    this.scheduleCleanup(filePath);

    return {
      filename,
      path: filePath,
      extension,
      mediaType: this.mediaTypeFromExtension(extension, mediaType)
    };
  }

  private getMaxDownloadBytes(mediaType: MediaType): number {
    const fallback = mediaType === 'image' || mediaType === 'gif' ? 20 * 1024 * 1024 : 100 * 1024 * 1024;
    const envName = mediaType === 'image' || mediaType === 'gif' ? 'MAX_IMAGE_DOWNLOAD_BYTES' : 'MAX_MEDIA_DOWNLOAD_BYTES';
    const raw = Number(process.env[envName] || fallback);
    return Number.isFinite(raw) && raw > 1024 ? Math.floor(raw) : fallback;
  }

  private async writeResponseToFile(response: Response, filePath: string, maxBytes: number): Promise<void> {
    if (!response.body) {
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) {
        throw new Error(`A mídia excede o limite permitido de ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
      }
      await Bun.write(filePath, buffer);
      return;
    }

    const reader = response.body.getReader();
    const writer = Bun.file(filePath).writer();
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new Error(`A mídia excede o limite permitido de ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
        }
        writer.write(value);
      }
      await writer.end();
    } catch (error) {
      try { await writer.end(); } catch { /* ignore */ }
      throw error;
    }
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
