import { DangerError, InvalidParameterError } from '@errors/index';
import type { AudioUploadPayload } from '@interface/ITranscription';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function readAudioUpload(req: Request, url: URL): Promise<AudioUploadPayload> {
  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  const contentLength = Number(req.headers.get('content-length') || 0);

  if (contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
    throw new DangerError('Arquivo muito grande. O limite é de 50 MB.', 413);
  }

  const languageInput: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
  let data: Uint8Array;
  let filename: string | undefined;
  let mimeType: string | undefined;

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

    const file = form.get('file') ?? form.get('audio') ?? form.get('media');

    if (!(file instanceof Blob)) {
      throw new InvalidParameterError(
        'Envie o arquivo no campo "file".',
        [{ field: 'file', message: 'Arquivo ausente no formulário.' }]
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new DangerError('Arquivo muito grande. O limite é de 50 MB.', 413);
    }

    for (const key of ['language', 'idioma', 'lang', 'style', 'length']) {
      const value = form.get(key);

      if (typeof value === 'string') {
        languageInput[key] = value;
      }
    }

    data = new Uint8Array(await file.arrayBuffer());
    filename = file instanceof File ? file.name : undefined;
    mimeType = file.type || undefined;
  } else {
    const isAllowedContentType = contentType.startsWith('audio/') ||
      contentType.startsWith('video/') ||
      contentType.startsWith('application/octet-stream');

    if (!isAllowedContentType) {
      throw new InvalidParameterError(
        'Envie multipart/form-data com o campo "file" ou o áudio bruto com Content-Type audio/* ou video/*.'
      );
    }

    const body = await req.arrayBuffer();

    if (body.byteLength > MAX_UPLOAD_BYTES) {
      throw new DangerError('Arquivo muito grande. O limite é de 50 MB.', 413);
    }

    data = new Uint8Array(body);
    filename = req.headers.get('x-filename') || undefined;
    mimeType = contentType.split(';')[0].trim();
  }

  return { languageInput, input: { data, filename, mimeType } };
}
