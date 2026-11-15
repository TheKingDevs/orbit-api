import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DangerError, InvalidParameterError } from '@errors/index';
import { CanvasEffect, ImageFormat, MirrorDirection } from '@apptypes/canvasEffects.type';
import { getTempDir } from '@utils/temp.util';
import { fetchSafeUrl, validateSafeUrl } from '@utils/urlSecurity.util';

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 2_500;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CIRCLE_ALPHA_FILTER = `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2),(W/2)*(W/2)),255,0)'`;

export type ImageSource = Buffer | Uint8Array | string;

export interface FfmpegOptions {
  format?: ImageFormat;
  blurRadius?: number;
  pixelSize?: number;
  upscaleFactor?: number;
  mirrorDirection?: MirrorDirection;
  size?: number;
}

class FfmpegServiceImpl {
  async process(
    source: ImageSource,
    effects: CanvasEffect[] = [],
    options: FfmpegOptions = {}
  ): Promise<Buffer> {
    if (typeof source === 'string') {
      return this.processUrl(source, effects, options);
    }

    return this.processBuffer(source, effects, options);
  }

  invert(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['invert'], options);
  }

  blur(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['blur'], options);
  }

  mirror(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['mirror'], options);
  }

  espelhar(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.mirror(source, options);
  }

  circle(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['circle'], options);
  }

  gray(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['gray'], options);
  }

  pixel(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['pixel'], options);
  }

  upscale(source: ImageSource, options: FfmpegOptions = {}): Promise<Buffer> {
    return this.process(source, ['upscale'], options);
  }

  async processUrl(
    url: string,
    effects: CanvasEffect[] = [],
    options: FfmpegOptions = {}
  ): Promise<Buffer> {
    const buffer = await this.fetchSource(url);
    return this.processBuffer(buffer, effects, options);
  }

  async processBuffer(
    source: Uint8Array,
    effects: CanvasEffect[] = [],
    options: FfmpegOptions = {}
  ): Promise<Buffer> {
    if (source.byteLength === 0) {
      throw new InvalidParameterError('A imagem está vazia.');
    }

    if (source.byteLength > MAX_INPUT_BYTES) {
      throw new InvalidParameterError('A imagem excede o limite de 20 MB.');
    }

    const ffmpeg = Bun.which('ffmpeg');

    if (!ffmpeg) {
      throw new DangerError('ffmpeg não encontrado. Instale o ffmpeg para processar imagens.');
    }

    const format = options.format ?? 'png';
    const directory = mkdtempSync(join(getTempDir(), 'orbit-image-'));
    const inputPath = join(directory, 'input.bin');
    const outputPath = join(directory, `output.${format}`);

    try {
      writeFileSync(inputPath, source);

      const filters = this.buildFilterChain(effects, options);
      const args = [
        ffmpeg,
        '-y',
        '-nostdin',
        '-hide_banner',
        '-loglevel', 'error',
        '-i', inputPath
      ];

      if (filters) {
        args.push('-vf', filters);
      }

      args.push('-frames:v', '1', '-an');

      if (format === 'webp') {
        args.push(
          '-c:v', 'libwebp',
          '-lossless', '1',
          '-compression_level', '6',
          '-pix_fmt', 'yuva420p'
        );
      } else {
        args.push('-c:v', 'png', '-pix_fmt', 'rgba');
      }

      args.push(outputPath);

      const proc = Bun.spawn(args, {
        stdout: 'ignore',
        stderr: 'pipe'
      });

      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, FFMPEG_TIMEOUT_MS);
      timeout.unref?.();

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      clearTimeout(timeout);

      if (timedOut) {
        throw new DangerError('O processamento da imagem excedeu o limite de 2,5 segundos.', 504);
      }

      if (exitCode !== 0) {
        throw new InvalidParameterError(
          'Não foi possível processar a imagem.',
          [{ field: 'file', message: this.lastErrorLine(stderr) }]
        );
      }

      const output = readFileSync(outputPath);

      if (output.length === 0) {
        throw new DangerError('ffmpeg não gerou a imagem processada.');
      }

      return output;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  private buildFilterChain(effects: CanvasEffect[], options: FfmpegOptions): string {
    const filters: string[] = [];
    const size = options.size;

    if (size) {
      filters.push(`scale=${size}:${size}:force_original_aspect_ratio=decrease:flags=lanczos`);
      filters.push(`pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
    }

    for (const effect of effects) {
      switch (effect) {
        case 'invert':
          filters.push('negate');
          break;
        case 'blur':
          filters.push(`gblur=sigma=${Math.min(50, Math.max(0.1, options.blurRadius ?? 8))}`);
          break;
        case 'mirror':
          if (options.mirrorDirection === 'vertical') {
            filters.push('vflip');
          } else if (options.mirrorDirection === 'both') {
            filters.push('hflip');
            filters.push('vflip');
          } else {
            filters.push('hflip');
          }
          break;
        case 'circle':
          filters.push(`crop='min(iw,ih)':'min(iw,ih)'`);
          filters.push('format=rgba');
          filters.push(CIRCLE_ALPHA_FILTER);
          break;
        case 'gray':
          filters.push('hue=s=0');
          break;
        case 'pixel':
          filters.push(this.pixelFilter(options.pixelSize ?? 16));
          break;
        case 'upscale': {
          const factor = Math.min(4, Math.max(1.1, options.upscaleFactor ?? 2));
          filters.push(`scale=w='trunc(iw*${factor})':h='trunc(ih*${factor})':flags=lanczos`);
          break;
        }
      }
    }

    return filters.join(',');
  }

  private pixelFilter(size: number): string {
    const block = Math.min(128, Math.max(2, Math.round(size)));
    return [
      `scale=w='max(1,trunc(iw/${block}))':h='max(1,trunc(ih/${block}))':flags=neighbor`,
      `scale=w='iw*${block}':h='ih*${block}':flags=neighbor`
    ].join(',');
  }

  private async fetchSource(source: string): Promise<Uint8Array> {
    if (source.startsWith('data:')) {
      return this.decodeDataUrl(source);
    }

    const validated = validateSafeUrl(source, { fieldName: 'url' });

    let response: Response;

    try {
      response = await fetchSafeUrl(validated, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'image/*,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(2_200)
      });
    } catch (error: any) {
      throw new DangerError(`Falha ao baixar a imagem: ${error.message}`, 502);
    }

    if (!response.ok) {
      throw new DangerError(`Falha ao baixar a imagem (HTTP ${response.status}).`, 502);
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

    if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
      throw new InvalidParameterError('O link informado não aponta para uma imagem.');
    }

    const contentLength = Number(response.headers.get('content-length') || 0);

    if (contentLength > MAX_INPUT_BYTES) {
      throw new InvalidParameterError('A imagem excede o limite de 20 MB.');
    }

    const buffer = new Uint8Array(await response.arrayBuffer());

    if (buffer.byteLength > MAX_INPUT_BYTES) {
      throw new InvalidParameterError('A imagem excede o limite de 20 MB.');
    }

    return buffer;
  }

  private decodeDataUrl(source: string): Uint8Array {
    const match = /^data:[^;]+;base64,(.+)$/is.exec(source);

    if (!match) {
      throw new InvalidParameterError('Data URL de imagem inválida.');
    }

    try {
      const buffer = Buffer.from(match[1], 'base64');

      if (buffer.byteLength > MAX_INPUT_BYTES) {
        throw new InvalidParameterError('A imagem excede o limite de 20 MB.');
      }

      return new Uint8Array(buffer);
    } catch (error: any) {
      if (error instanceof InvalidParameterError) throw error;
      throw new InvalidParameterError('Data URL de imagem inválida.');
    }
  }

  private lastErrorLine(stderr: string): string {
    const lines = stderr.trim().split('\n').filter(Boolean);
    return (lines[lines.length - 1] || 'ffmpeg falhou.').slice(0, 300);
  }
}

export const FfmpegService = new FfmpegServiceImpl();
