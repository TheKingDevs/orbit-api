import { DangerError, InvalidParameterError } from '@errors/index';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ImageSource } from '@services/ffmpeg.service';
import { StickerDTO, StickerFormat } from '@types/sticker.type';
import { ValidatorUtil } from '@utils/validator.util';
import { validateSafeUrl } from '@utils/urlSecurity.util';

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const FILE_FIELDS = ['file', 'image', 'photo', 'imagem', 'sticker', 'media'];
const URL_FIELDS = ['url', 'imageUrl', 'image_url', 'image', 'imagem', 'imagemUrl', 'link', 'src'];

export interface ImageRouteOptions {
  defaultFormat: StickerFormat;
  defaultSize?: number;
  processor: (source: ImageSource, dto: StickerDTO) => Promise<Buffer>;
}

export async function processImageRoute(
  req: Request,
  url: URL,
  options: ImageRouteOptions
): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    throw new DangerError('Método não permitido. Use GET ou POST.', 405);
  }

  authMiddleware(req);

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  const contentLength = Number(req.headers.get('content-length') || 0);

  if (contentLength > MAX_INPUT_BYTES + 1024 * 1024) {
    throw new DangerError('Imagem muito grande. O limite é de 20 MB.', 413);
  }

  const params: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
  let source: ImageSource | undefined;

  if (req.method === 'POST') {
    if (contentType.startsWith('multipart/form-data')) {
      let form: FormData;

      try {
        form = await req.formData();
      } catch {
        throw new InvalidParameterError(
          'Não foi possível ler o formulário multipart.',
          [{ field: 'file', message: 'Envie um multipart/form-data válido.' }]
        );
      }

      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') {
          params[key] = value;
        }
      }

      const file = FILE_FIELDS
        .map(field => form.get(field))
        .find(value => value instanceof Blob) as Blob | undefined;

      if (file) {
        if (file.size > MAX_INPUT_BYTES) {
          throw new DangerError('Imagem muito grande. O limite é de 20 MB.', 413);
        }

        const mimeType = file.type.toLowerCase();

        if (mimeType && !mimeType.startsWith('image/') && mimeType !== 'application/octet-stream') {
          throw new InvalidParameterError('O arquivo enviado não é uma imagem.');
        }

        source = new Uint8Array(await file.arrayBuffer());
      }
    } else if (contentType.startsWith('application/json')) {
      let body: any;

      try {
        body = await req.json();
      } catch {
        throw new InvalidParameterError('JSON inválido.');
      }

      if (body && typeof body === 'object' && !Array.isArray(body)) {
        for (const [key, value] of Object.entries(body)) {
          if (typeof value === 'string' || typeof value === 'number') {
            params[key] = value;
          }
        }

        const imageValue = body.image ?? body.base64 ?? body.data;

        if (typeof imageValue === 'string' && imageValue.length > 0) {
          if (imageValue.startsWith('data:')) {
            source = imageValue;
          } else if (/^https?:\/\//i.test(imageValue)) {
            source = imageValue;
          } else {
            source = `data:image/png;base64,${imageValue}`;
          }
        }
      }
    } else if (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')) {
      const body = await req.arrayBuffer();

      if (body.byteLength > MAX_INPUT_BYTES) {
        throw new DangerError('Imagem muito grande. O limite é de 20 MB.', 413);
      }

      source = new Uint8Array(body);
    } else if (contentLength > 0) {
      throw new InvalidParameterError(
        'Envie multipart/form-data com o campo "file", JSON com "url" ou a imagem bruta no corpo.'
      );
    }
  }

  if (!source) {
    for (const field of URL_FIELDS) {
      const value = params[field];

      if (typeof value === 'string' && value.trim()) {
        source = value.trim();
        break;
      }
    }
  }

  if (!source) {
    throw new InvalidParameterError(
      'Informe uma imagem no buffer (multipart/corpo bruto) ou um link em "url".'
    );
  }

  const dto = ValidatorUtil.validateStickerPayload(params);
  if (typeof source === 'string' && !source.startsWith('data:')) {
    source = dto.url || validateSafeUrl(source, { fieldName: 'url' });
  }
  const resolved: StickerDTO = {
    ...dto,
    format: dto.format ?? options.defaultFormat,
    size: dto.size ?? options.defaultSize
  };
  const output = await options.processor(source, resolved);
  const format = resolved.format ?? options.defaultFormat;
  const contentTypeOutput = format === 'webp' ? 'image/webp' : 'image/png';

  return new Response(output, {
    headers: {
      'Content-Type': contentTypeOutput,
      'Content-Length': String(output.length),
      'Content-Disposition': `inline; filename="orbit-sticker.${format}"`,
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
