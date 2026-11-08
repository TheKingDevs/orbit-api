import { DangerError, InvalidParameterError } from '@errors/index';
import { authMiddleware } from '@middlewares/authMiddleware';
import { OcrService } from '@services/ocr.service';
import { ValidatorUtil } from '@utils/validator.util';
import { jsonResponse } from '@utils/request.util';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function ocrRoute(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'POST') throw new DangerError('Método não permitido. Use POST.', 405);
  authMiddleware(req);

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_BYTES + 1024 * 1024) {
    throw new DangerError('Imagem muito grande. O limite é de 15 MB.', 413);
  }

  const languageInput: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
  let data: Uint8Array;

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

    const file = form.get('file') ?? form.get('image');
    if (!(file instanceof Blob)) {
      throw new InvalidParameterError(
        'Envie a imagem no campo "file".',
        [{ field: 'file', message: 'Arquivo ausente no formulário.' }]
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new DangerError('Imagem muito grande. O limite é de 15 MB.', 413);
    }

    for (const key of ['language', 'idioma', 'lang']) {
      const value = form.get(key);
      if (typeof value === 'string') languageInput[key] = value;
    }
    data = new Uint8Array(await file.arrayBuffer());
  } else {
    if (!contentType.startsWith('image/')) {
      throw new InvalidParameterError(
        'Envie multipart/form-data com o campo "file" ou uma imagem bruta com Content-Type image/*.'
      );
    }

    const body = await req.arrayBuffer();
    if (body.byteLength > MAX_IMAGE_BYTES) {
      throw new DangerError('Imagem muito grande. O limite é de 15 MB.', 413);
    }
    data = new Uint8Array(body);
  }

  const dto = ValidatorUtil.validateOcrPayload(languageInput);
  const result = await OcrService.recognize(data, dto.language);

  return jsonResponse({
    success: true,
    message: 'OCR concluído com sucesso.',
    ...result
  });
}
